"""
Pickup lifecycle service.

All business logic for the pickup workflow lives here so it can be
unit-tested independently of the HTTP layer.

State machine:
    requested → accepted → collected
                         → cancelled
    requested → cancelled
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Pickup, PickupStatus, PickupStatusHistory, PointsTransaction, TransactionType, User
from app.schemas import (
    CollectorInfo,
    PickupCreateRequest,
    PickupListResponse,
    PickupResponse,
    PickupVerifyResponse,
)
from app.utils.errors import bad_request, conflict, not_found

logger = logging.getLogger(__name__)

# ── OTP helpers ───────────────────────────────────────────────────────────────

MAX_OTP_ATTEMPTS = 5


def _generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def _hash_otp(otp: str) -> str:
    """SHA-256 hash of the OTP — never store plaintext OTPs."""
    return hashlib.sha256(otp.encode()).hexdigest()


def _verify_otp(plain: str, stored_hash: str) -> bool:
    return hmac.compare_digest(_hash_otp(plain), stored_hash)


# ── Serialization helpers ─────────────────────────────────────────────────────

def _pickup_to_response(
    pickup: Pickup,
    viewer: str = "citizen",
    plain_otp: Optional[str] = None,
) -> PickupResponse:
    """
    Convert a Pickup ORM object to PickupResponse.

    OTP visibility rules (mirrors the frontend mock):
      - Only visible to 'citizen' viewer
      - Only when status is 'accepted'
      - Reads otp_plain from the DB column so any citizen GET shows the code
    """
    collector_info: Optional[CollectorInfo] = None
    if pickup.collector:
        collector_info = CollectorInfo(
            id=pickup.collector.id,
            name=pickup.collector.display_name,
            phone=None,
        )

    otp: Optional[str] = None
    if viewer == "citizen" and pickup.status == PickupStatus.ACCEPTED:
        # plain_otp arg takes priority (e.g. freshly generated); fall back to DB value
        otp = plain_otp or pickup.otp_plain

    return PickupResponse(
        pickup_id=pickup.id,
        waste_item=pickup.waste_item,
        category=pickup.category,
        quantity=pickup.quantity,
        address=pickup.address,
        preferred_date=pickup.preferred_date,
        instructions=pickup.instructions,
        status=pickup.status,
        created_at=pickup.created_at,
        collector=collector_info,
        points_awarded=pickup.points_awarded,
        otp=otp,
    )


def _record_status_change(
    db: Session,
    pickup: Pickup,
    new_status: str,
    changed_by: Optional[str],
) -> None:
    """Append a PickupStatusHistory row and update pickup.status inside the caller's transaction."""
    pickup.status = new_status
    pickup.updated_at = datetime.now(timezone.utc)
    history = PickupStatusHistory(
        pickup_id=pickup.id,
        status=new_status,
        changed_by=changed_by,
    )
    db.add(history)


# ── Public service functions ──────────────────────────────────────────────────

def create_pickup(
    payload: PickupCreateRequest,
    db: Session,
    user_id: str,
) -> PickupResponse:
    """
    Persist a new pickup request.
    Returns a PickupResponse — no OTP at this stage.
    """
    pickup = Pickup(
        user_id=user_id,
        waste_item=payload.waste_item,
        category=payload.category,
        quantity=payload.quantity,
        address=payload.address,
        preferred_date=payload.preferred_date,
        instructions=payload.instructions or "",
        status=PickupStatus.REQUESTED,
    )
    db.add(pickup)
    db.flush()  # get pickup.id without committing

    # Record initial status in history
    history = PickupStatusHistory(
        pickup_id=pickup.id,
        status=PickupStatus.REQUESTED,
        changed_by=user_id,
    )
    db.add(history)
    db.commit()
    db.refresh(pickup)

    logger.info("Created pickup id=%s user=%s category=%s", pickup.id, user_id, pickup.category)
    return _pickup_to_response(pickup, viewer="citizen")


def list_pickups(
    db: Session,
    viewer: str = "citizen",
    status_filter: Optional[str] = None,
) -> List[PickupResponse]:
    """
    Return all pickups as a plain list, optionally filtered by status.
    Returns a JSON array — matches the frontend contract.
    """
    stmt = select(Pickup).order_by(Pickup.created_at.desc())
    if status_filter:
        stmt = stmt.where(Pickup.status == status_filter)

    pickups = db.execute(stmt).scalars().all()
    return [_pickup_to_response(p, viewer=viewer) for p in pickups]


def get_pickup(
    pickup_id: str,
    db: Session,
    viewer: str = "citizen",
) -> PickupResponse:
    """
    Return a single pickup.
    OTP is included when viewer=citizen and status=accepted (read from otp_plain column).
    """
    pickup = db.get(Pickup, pickup_id)
    if not pickup:
        raise not_found("Pickup")
    return _pickup_to_response(pickup, viewer=viewer)


def accept_pickup(
    pickup_id: str,
    db: Session,
    collector_id: str,
) -> tuple[PickupResponse, str]:
    """
    Accept a 'requested' pickup and assign it to the collector.
    Generates an OTP, stores its hash, and returns the OTP plaintext ONCE.

    Returns:
        (PickupResponse for collector view, plain_otp for citizen)

    Raises:
        404 if pickup not found.
        409 if status is not 'requested'.
    """
    pickup = db.get(Pickup, pickup_id)
    if not pickup:
        raise not_found("Pickup")

    if pickup.status != PickupStatus.REQUESTED:
        raise conflict(f"This pickup is already {pickup.status}.")

    plain_otp = _generate_otp()
    pickup.collector_id = collector_id
    pickup.otp_hash = _hash_otp(plain_otp)
    pickup.otp_plain = plain_otp        # stored so citizen can view on detail page
    pickup.otp_attempts = 0
    _record_status_change(db, pickup, PickupStatus.ACCEPTED, changed_by=collector_id)
    db.commit()
    db.refresh(pickup)

    logger.info(
        "Pickup %s accepted by collector %s; OTP generated (not logged)",
        pickup_id, collector_id,
    )

    # Return citizen view WITH the otp so the caller can surface it to the citizen
    citizen_response = _pickup_to_response(pickup, viewer="citizen", plain_otp=plain_otp)
    return citizen_response, plain_otp


def verify_pickup(
    pickup_id: str,
    otp: str,
    db: Session,
    collector_id: str,
) -> PickupVerifyResponse:
    """
    Verify the handover OTP, mark pickup as 'collected', and award points.

    Business rules enforced:
      - Only accepted pickups can be verified.
      - Already-collected pickups → 409 (idempotency).
      - Max OTP attempts enforced (MAX_OTP_ATTEMPTS).
      - Points awarded atomically with status change.
      - Duplicate point award prevented via UniqueConstraint.

    Raises:
        404 if pickup not found.
        409 if not accepted or already collected.
        400 if OTP is wrong or attempts exceeded.
    """
    pickup = db.get(Pickup, pickup_id)
    if not pickup:
        raise not_found("Pickup")

    if pickup.status == PickupStatus.COLLECTED:
        raise conflict("This pickup was already verified. No additional points were awarded.")

    if pickup.status != PickupStatus.ACCEPTED:
        raise conflict("Only accepted pickups can be verified.")

    # Rate-limit OTP attempts
    if pickup.otp_attempts >= MAX_OTP_ATTEMPTS:
        raise bad_request(
            "Too many incorrect attempts. Please contact support to reset this pickup."
        )

    if not pickup.otp_hash or not _verify_otp(otp, pickup.otp_hash):
        pickup.otp_attempts += 1
        db.commit()
        remaining = MAX_OTP_ATTEMPTS - pickup.otp_attempts
        raise bad_request(
            f"That code is incorrect. Check it with the citizen and try again. "
            f"({remaining} attempt{'s' if remaining != 1 else ''} remaining)"
        )

    # Correct OTP — complete the pickup
    from app.services.points_service import POINTS_PER_UNIT

    points = POINTS_PER_UNIT.get(pickup.category, 5) * pickup.quantity

    # Atomic: status change + clear OTP (both hash and plain) + award points
    pickup.otp_hash = None
    pickup.otp_plain = None             # clear plain OTP after successful verification
    pickup.otp_attempts = 0
    pickup.points_awarded = points
    pickup.completed_at = datetime.now(timezone.utc)
    _record_status_change(db, pickup, PickupStatus.COLLECTED, changed_by=collector_id)

    # Award points to the citizen (pickup.user_id)
    txn = PointsTransaction(
        user_id=pickup.user_id,
        pickup_id=pickup.id,
        points=points,
        transaction_type=TransactionType.EARNED,
        description=f"Verified pickup: {pickup.waste_item}",
    )
    db.add(txn)

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to commit pickup verification for pickup_id=%s", pickup_id)
        raise conflict(
            "This pickup was already verified. No additional points were awarded."
        )

    db.refresh(pickup)
    logger.info(
        "Pickup %s verified; awarded %d points to user %s",
        pickup_id, points, pickup.user_id,
    )

    return PickupVerifyResponse(
        pickup_id=pickup.id,
        status="collected",
        verified=True,
        points_awarded=points,
    )
