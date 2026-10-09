"""
GET /api/impact — environmental impact dashboard metrics.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ImpactResponse
from app.services.impact_service import get_impact

router = APIRouter()


@router.get(
    "/impact",
    response_model=ImpactResponse,
    tags=["Impact"],
    summary="Get environmental impact metrics",
)
def impact_dashboard(db: Session = Depends(get_db)) -> ImpactResponse:
    """
    Return aggregated environmental impact from completed pickups.

    Metrics are calculated from persisted data only.
    No estimated conversion factors or invented environmental savings are used.
    If there is no data, all values return zero.
    """
    return get_impact(db)
