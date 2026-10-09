"""
SQLAlchemy ORM models for EcoCycle.

Entity relationships:
  User  ──< Pickup  ──< PickupStatusHistory
                    ──< PointsTransaction
  WasteAnalysis ──< Pickup (optional link via analysis_id)
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ── Enums (stored as strings for portability) ─────────────────────────────────

class UserRole:
    CITIZEN = "citizen"
    COLLECTOR = "collector"
    ADMIN = "admin"


class WasteCategory:
    PLASTIC = "plastic"
    PAPER = "paper"
    GLASS = "glass"
    METAL = "metal"
    E_WASTE = "e-waste"
    ORGANIC = "organic"
    HAZARDOUS = "hazardous"
    OTHER = "other"

    ALL = {PLASTIC, PAPER, GLASS, METAL, E_WASTE, ORGANIC, HAZARDOUS, OTHER}


class PickupStatus:
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    COLLECTED = "collected"
    CANCELLED = "cancelled"

    # Valid transitions: from → {allowed next states}
    TRANSITIONS: dict[str, set[str]] = {
        REQUESTED: {ACCEPTED, CANCELLED},
        ACCEPTED: {COLLECTED, CANCELLED},
        COLLECTED: set(),   # terminal
        CANCELLED: set(),   # terminal
    }

    @classmethod
    def can_transition(cls, current: str, next_status: str) -> bool:
        return next_status in cls.TRANSITIONS.get(current, set())


class TransactionType:
    EARNED = "earned"
    REDEEMED = "redeemed"


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.CITIZEN)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    pickups: Mapped[list["Pickup"]] = relationship(
        "Pickup", foreign_keys="Pickup.user_id", back_populates="user"
    )
    collected_pickups: Mapped[list["Pickup"]] = relationship(
        "Pickup", foreign_keys="Pickup.collector_id", back_populates="collector"
    )
    transactions: Mapped[list["PointsTransaction"]] = relationship(
        "PointsTransaction", back_populates="user"
    )


class WasteAnalysis(Base):
    __tablename__ = "waste_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    item_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    recyclable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    hazard_warning: Mapped[str | None] = mapped_column(Text, nullable=True)
    disposal_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    recycler_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    recycler_address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    estimated_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    pickups: Mapped[list["Pickup"]] = relationship("Pickup", back_populates="analysis")


class Pickup(Base):
    __tablename__ = "pickups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    analysis_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("waste_analyses.id", ondelete="SET NULL"), nullable=True
    )
    collector_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    waste_item: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    preferred_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PickupStatus.REQUESTED
    )

    # OTP for handover verification — never returned to collectors or in list endpoints
    # otp_hash: used for secure comparison at verification time
    # otp_plain: stored temporarily so the citizen can see it on the detail page
    #            cleared (set to None) immediately after successful verification
    otp_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    otp_plain: Mapped[str | None] = mapped_column(String(6), nullable=True)
    otp_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    points_awarded: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=_utcnow,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="pickups")
    collector: Mapped["User | None"] = relationship(
        "User", foreign_keys=[collector_id], back_populates="collected_pickups"
    )
    analysis: Mapped["WasteAnalysis | None"] = relationship(
        "WasteAnalysis", back_populates="pickups"
    )
    status_history: Mapped[list["PickupStatusHistory"]] = relationship(
        "PickupStatusHistory", back_populates="pickup", order_by="PickupStatusHistory.created_at"
    )
    transactions: Mapped[list["PointsTransaction"]] = relationship(
        "PointsTransaction", back_populates="pickup"
    )


class PickupStatusHistory(Base):
    __tablename__ = "pickup_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    pickup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("pickups.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)  # user_id or None
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationship
    pickup: Mapped["Pickup"] = relationship("Pickup", back_populates="status_history")


class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    # Prevent duplicate point awards for the same completed pickup
    __table_args__ = (
        UniqueConstraint("pickup_id", "transaction_type", name="uq_pickup_points_earned"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    pickup_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("pickups.id", ondelete="SET NULL"), nullable=True
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TransactionType.EARNED
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="transactions")
    pickup: Mapped["Pickup | None"] = relationship("Pickup", back_populates="transactions")
