"""
GET /api/user/points — user points balance and transaction history.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserPointsResponse
from app.services.points_service import get_user_points

router = APIRouter()


def _get_demo_citizen_id(db: Session) -> str:
    """Return demo citizen ID (same logic as pickups.py demo dependency)."""
    from app.models import User
    from sqlalchemy import select

    stmt = select(User).where(User.role == "citizen").limit(1)
    user = db.execute(stmt).scalar_one_or_none()
    if user is None:
        user = User(display_name="Demo Citizen", role="citizen")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user.id


@router.get(
    "/user/points",
    response_model=UserPointsResponse,
    tags=["Users"],
    summary="Get user points balance",
)
def get_points(db: Session = Depends(get_db)) -> UserPointsResponse:
    """
    Return the demo citizen's total points and recent transaction history.
    Points are calculated from the transactions ledger — never from frontend values.
    """
    user_id = _get_demo_citizen_id(db)
    return get_user_points(user_id, db)
