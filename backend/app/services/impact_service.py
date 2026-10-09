"""
Environmental impact service.

Calculates metrics from persisted pickup records.
Only completed ('collected') pickups count toward impact figures.

Calculation method:
  - completed_pickups: COUNT of pickups with status='collected'
  - items_collected: SUM of quantity for completed pickups
  - category_breakdown: GROUP BY category, SUM(quantity) for completed pickups
  - recent_activity: last 5 completed pickups ordered by completed_at desc

No invented environmental conversion factors are used. If a metric requires
an assumption, document it here and label the estimate clearly in the response.
"""
from __future__ import annotations

import logging
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Pickup, PickupStatus
from app.schemas import CategoryBreakdown, ImpactResponse, RecentActivityItem

logger = logging.getLogger(__name__)


def get_impact(db: Session) -> ImpactResponse:
    """
    Aggregate environmental impact metrics from completed pickups.
    """
    # Fetch all completed pickups
    stmt = (
        select(Pickup)
        .where(Pickup.status == PickupStatus.COLLECTED)
        .order_by(Pickup.completed_at.desc())
    )
    completed: List[Pickup] = db.execute(stmt).scalars().all()

    completed_count = len(completed)
    items_collected = sum(p.quantity for p in completed)

    # Category breakdown: group by category, sum quantities
    category_totals: dict[str, int] = {}
    for p in completed:
        category_totals[p.category] = category_totals.get(p.category, 0) + p.quantity

    category_breakdown = [
        CategoryBreakdown(category=cat, count=qty)
        for cat, qty in sorted(category_totals.items())
    ]

    # Recent activity: last 5 completed pickups
    recent_activity = [
        RecentActivityItem(
            pickup_id=p.id,
            waste_item=p.waste_item,
            quantity=p.quantity,
            created_at=p.created_at,
        )
        for p in completed[:5]
    ]

    return ImpactResponse(
        completed_pickups=completed_count,
        items_collected=items_collected,
        category_breakdown=category_breakdown,
        recent_activity=recent_activity,
    )
