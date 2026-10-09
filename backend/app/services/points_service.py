"""
Points service — ledger queries and balance calculations.

Points are only awarded by the verified pickup flow (pickup_service.verify_pickup).
This module handles read-only queries for the /api/user/points endpoint.

POINTS_PER_UNIT mirrors the frontend mock/waste.js POINTS_PER_UNIT constant.
It is also imported by pickup_service to calculate awards, keeping a single source of truth.
"""
from __future__ import annotations

import logging
from typing import List

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import PointsTransaction, TransactionType
from app.schemas import PointsTransactionResponse, UserPointsResponse

logger = logging.getLogger(__name__)

# Single source of truth for point values — mirrors frontend POINTS_PER_UNIT
POINTS_PER_UNIT: dict[str, int] = {
    "plastic": 12,
    "paper": 6,
    "glass": 8,
    "metal": 10,
    "e-waste": 30,
    "organic": 4,
    "hazardous": 30,
    "other": 5,
}


def get_user_points(user_id: str, db: Session) -> UserPointsResponse:
    """
    Return the user's point balance and recent transactions.

    Balance = sum of all EARNED transactions for this user.
    (Redeemed transactions would subtract, but redemption is not in the MVP.)
    """
    stmt = (
        select(PointsTransaction)
        .where(PointsTransaction.user_id == user_id)
        .order_by(PointsTransaction.created_at.desc())
    )
    transactions: List[PointsTransaction] = db.execute(stmt).scalars().all()

    total_points = sum(
        t.points for t in transactions if t.transaction_type == TransactionType.EARNED
    )

    transaction_responses = [
        PointsTransactionResponse(
            id=t.id,
            pickup_id=t.pickup_id,
            points=t.points,
            description=t.description,
            created_at=t.created_at,
        )
        for t in transactions
    ]

    return UserPointsResponse(
        total_points=total_points,
        transactions=transaction_responses,
    )
