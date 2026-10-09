"""
Pickup lifecycle routes.

POST   /api/pickup/request          — create a pickup request
GET    /api/pickup                  — list pickups (optional ?status= filter)
GET    /api/pickup/{pickup_id}      — get pickup details
PATCH  /api/pickup/{pickup_id}/accept   — collector accepts a pickup
POST   /api/pickup/{pickup_id}/verify   — verify handover via OTP

Demo identity (MVP, no auth):
  Citizen:   demo citizen user seeded at startup
  Collector: demo collector user seeded at startup
Both IDs are read from the database by role at startup; see main.py.

In a production build, replace get_current_citizen() / get_current_collector()
with real JWT-based auth dependencies.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    PickupCreateRequest,
    PickupListResponse,
    PickupResponse,
    PickupVerifyRequest,
    PickupVerifyResponse,
)
from app.services import pickup_service
from app.utils.errors import server_error

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Demo identity helpers (MVP — replace with real auth) ─────────────────────

def _get_demo_user_id(db: Session, role: str) -> str:
    """Return the demo user ID for the given role. Created at startup if missing."""
    from app.models import User, UserRole
    from sqlalchemy import select

    stmt = select(User).where(User.role == role).limit(1)
    user = db.execute(stmt).scalar_one_or_none()
    if user is None:
        # Shouldn't happen after startup seed, but be defensive
        user = User(display_name=f"Demo {role.capitalize()}", role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user.id


def get_demo_citizen(db: Session = Depends(get_db)) -> str:
    """Dependency: returns demo citizen user_id."""
    return _get_demo_user_id(db, "citizen")


def get_demo_collector(db: Session = Depends(get_db)) -> str:
    """Dependency: returns demo collector user_id."""
    return _get_demo_user_id(db, "collector")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/pickup/request",
    response_model=PickupResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Pickups"],
    summary="Create a pickup request",
)
def create_pickup(
    payload: PickupCreateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_demo_citizen),
) -> PickupResponse:
    """
    Create and persist a new pickup request.
    Returns the created pickup with status='requested'.
    """
    return pickup_service.create_pickup(payload, db, user_id)


@router.get(
    "/pickup",
    response_model=List[PickupResponse],
    status_code=status.HTTP_200_OK,
    tags=["Pickups"],
    summary="List pickup requests",
)
def list_pickups(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    viewer: str = Query(default="citizen", description="'citizen' or 'collector'"),
    db: Session = Depends(get_db),
) -> List[PickupResponse]:
    """
    Return all pickups as a JSON array, optionally filtered by status.
    Pass viewer=collector to hide OTPs.
    """
    return pickup_service.list_pickups(db, viewer=viewer, status_filter=status)


@router.get(
    "/pickup/{pickup_id}",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Pickups"],
    summary="Get pickup details",
)
def get_pickup(
    pickup_id: str,
    viewer: str = Query(default="citizen", description="'citizen' or 'collector'"),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Return a single pickup's details including status timeline.
    Returns 404 if the pickup does not exist.
    """
    return pickup_service.get_pickup(pickup_id, db, viewer=viewer)


@router.patch(
    "/pickup/{pickup_id}/accept",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Pickups"],
    summary="Collector accepts a pickup",
)
def accept_pickup(
    pickup_id: str,
    db: Session = Depends(get_db),
    collector_id: str = Depends(get_demo_collector),
) -> PickupResponse:
    """
    Accept a pickup that is in 'requested' status.
    Assigns the collector, generates an OTP, and returns the updated pickup.

    The OTP is included in the citizen-view response so the citizen can note it
    and share it with the collector at handover time.

    Returns 409 if the pickup is not in 'requested' status.
    """
    citizen_response, _plain_otp = pickup_service.accept_pickup(
        pickup_id, db, collector_id
    )
    # Return the citizen view (includes OTP) so the caller can surface it to the citizen
    return citizen_response


@router.post(
    "/pickup/{pickup_id}/verify",
    response_model=PickupVerifyResponse,
    status_code=status.HTTP_200_OK,
    tags=["Pickups"],
    summary="Verify handover via OTP",
)
def verify_pickup(
    pickup_id: str,
    payload: PickupVerifyRequest,
    db: Session = Depends(get_db),
    collector_id: str = Depends(get_demo_collector),
) -> PickupVerifyResponse:
    """
    Verify the waste handover using the 6-digit OTP.
    On success: marks pickup as 'collected' and awards points.

    Returns 409 if already collected or not yet accepted.
    Returns 400 if the OTP is incorrect or attempts exhausted.
    """
    return pickup_service.verify_pickup(pickup_id, payload.otp, db, collector_id)
