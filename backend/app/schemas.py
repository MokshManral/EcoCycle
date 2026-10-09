"""
Pydantic request and response schemas.
These define the public API contract — keep them consistent with the frontend.

Key naming conventions (agreed with frontend team):
  - snake_case JSON fields
  - ISO 8601 timestamps
  - Status values: requested | accepted | collected | cancelled
  - Category values: plastic | paper | glass | metal | e-waste | organic | hazardous | other
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Shared / Common ───────────────────────────────────────────────────────────

VALID_CATEGORIES = {
    "plastic", "paper", "glass", "metal",
    "e-waste", "organic", "hazardous", "other",
}

VALID_STATUSES = {"requested", "accepted", "collected", "cancelled"}


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str


# ── Waste Analysis ────────────────────────────────────────────────────────────

class RecyclerInfo(BaseModel):
    name: str
    address: str


class WasteAnalysisResponse(BaseModel):
    """
    Response for POST /api/waste/analyze.
    Mirrors the frontend mock schema exactly — do not rename fields.
    """
    item_name: Optional[str] = None
    category: Optional[str] = None
    confidence: Optional[float] = None
    hazard_warning: Optional[str] = None
    disposal_method: Optional[str] = None
    recycler: Optional[RecyclerInfo] = None
    estimated_points: Optional[int] = None


# ── Pickup ────────────────────────────────────────────────────────────────────

class CollectorInfo(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None


class PickupCreateRequest(BaseModel):
    """Body for POST /api/pickup/request."""
    waste_item: str = Field(..., min_length=1, max_length=300)
    category: str
    quantity: int = Field(..., ge=1)
    address: str = Field(..., min_length=8, max_length=500)
    preferred_date: Optional[str] = None   # YYYY-MM-DD
    instructions: str = Field(default="", max_length=1000)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        normalized = v.lower().strip()
        if normalized not in VALID_CATEGORIES:
            raise ValueError(
                f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
            )
        return normalized

    @field_validator("preferred_date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("preferred_date must be in YYYY-MM-DD format")
        return v


class PickupResponse(BaseModel):
    """Single pickup object — used in create, list, and detail responses."""
    model_config = ConfigDict(from_attributes=True)

    pickup_id: str
    waste_item: str
    category: str
    quantity: int
    address: str
    preferred_date: Optional[str]
    instructions: str
    status: str
    created_at: datetime
    collector: Optional[CollectorInfo] = None
    points_awarded: Optional[int] = None
    # otp is conditionally included — only when viewer=citizen AND status=accepted
    otp: Optional[str] = None


# The list endpoint returns a plain JSON array (matches frontend contract).
# PickupListResponse is kept as a type alias for clarity in the service layer.
PickupListResponse = List[PickupResponse]


# ── Pickup Accept ─────────────────────────────────────────────────────────────

class PickupAcceptResponse(PickupResponse):
    """Response for PATCH /api/pickup/{id}/accept."""
    pass


# ── Pickup Verify ─────────────────────────────────────────────────────────────

class PickupVerifyRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class PickupVerifyResponse(BaseModel):
    pickup_id: str
    status: Literal["collected"]
    verified: bool
    points_awarded: int


# ── Points ────────────────────────────────────────────────────────────────────

class PointsTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pickup_id: Optional[str] = None
    points: int
    description: str
    created_at: datetime


class UserPointsResponse(BaseModel):
    total_points: int
    transactions: List[PointsTransactionResponse]


# ── Impact ────────────────────────────────────────────────────────────────────

class CategoryBreakdown(BaseModel):
    category: str
    count: int


class RecentActivityItem(BaseModel):
    pickup_id: str
    waste_item: str
    quantity: int
    created_at: datetime


class ImpactResponse(BaseModel):
    completed_pickups: int
    items_collected: int
    category_breakdown: List[CategoryBreakdown]
    recent_activity: List[RecentActivityItem]
