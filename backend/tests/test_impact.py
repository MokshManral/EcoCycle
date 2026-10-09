"""
Tests for GET /api/impact and GET /api/user/points.
"""
from __future__ import annotations

VALID_PAYLOAD = {
    "waste_item": "Glass jars",
    "category": "glass",
    "quantity": 5,
    "address": "123 Sample Street, Demo City",
    "preferred_date": None,
    "instructions": "",
}


def _complete_pickup(client, payload=None) -> dict:
    """Helper: create → accept → verify a pickup. Returns verify response."""
    p = client.post("/api/pickup/request", json=payload or VALID_PAYLOAD).json()
    pid = p["pickup_id"]
    otp = client.patch(f"/api/pickup/{pid}/accept").json()["otp"]
    return client.post(f"/api/pickup/{pid}/verify", json={"otp": otp}).json()


# ── Impact endpoint ───────────────────────────────────────────────────────────

def test_impact_empty_database(client):
    resp = client.get("/api/impact")
    assert resp.status_code == 200
    body = resp.json()
    assert body["completed_pickups"] == 0
    assert body["items_collected"] == 0
    assert body["category_breakdown"] == []
    assert body["recent_activity"] == []


def test_impact_after_one_completion(client):
    _complete_pickup(client)
    body = client.get("/api/impact").json()
    assert body["completed_pickups"] == 1
    assert body["items_collected"] == 5
    assert any(cb["category"] == "glass" for cb in body["category_breakdown"])


def test_impact_counts_only_collected_pickups(client):
    """Pickups in 'requested' or 'accepted' state must not count."""
    # Create but don't accept/verify
    client.post("/api/pickup/request", json=VALID_PAYLOAD)
    body = client.get("/api/impact").json()
    assert body["completed_pickups"] == 0


def test_impact_category_breakdown_aggregates_correctly(client):
    _complete_pickup(client, {**VALID_PAYLOAD, "category": "plastic", "quantity": 3})
    _complete_pickup(client, {**VALID_PAYLOAD, "category": "plastic", "quantity": 7})
    body = client.get("/api/impact").json()
    plastic = next(cb for cb in body["category_breakdown"] if cb["category"] == "plastic")
    assert plastic["count"] == 10


def test_impact_recent_activity_capped_at_five(client):
    for i in range(7):
        _complete_pickup(client, {**VALID_PAYLOAD, "waste_item": f"Item {i}", "quantity": 1})
    body = client.get("/api/impact").json()
    assert len(body["recent_activity"]) <= 5


# ── Points endpoint ───────────────────────────────────────────────────────────

def test_points_empty_returns_zero(client):
    resp = client.get("/api/user/points")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_points"] == 0
    assert body["transactions"] == []


def test_points_after_verified_pickup(client):
    """glass × 5 = 8 × 5 = 40 points."""
    _complete_pickup(client)
    body = client.get("/api/user/points").json()
    assert body["total_points"] == 40
    assert len(body["transactions"]) == 1
    txn = body["transactions"][0]
    assert txn["points"] == 40
    assert "pickup_id" in txn
    assert "description" in txn
    assert "created_at" in txn


def test_points_accumulate_across_pickups(client):
    """Two verified pickups: glass×5 (40) + plastic×2 (24) = 64."""
    _complete_pickup(client, {**VALID_PAYLOAD, "category": "glass", "quantity": 5})
    _complete_pickup(client, {**VALID_PAYLOAD, "category": "plastic", "quantity": 2})
    body = client.get("/api/user/points").json()
    assert body["total_points"] == 64
    assert len(body["transactions"]) == 2


def test_points_transaction_has_required_fields(client):
    _complete_pickup(client)
    transactions = client.get("/api/user/points").json()["transactions"]
    txn = transactions[0]
    for field in ("id", "pickup_id", "points", "description", "created_at"):
        assert field in txn, f"Missing field: {field}"
