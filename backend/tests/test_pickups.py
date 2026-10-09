"""
Tests for the pickup lifecycle:
  POST   /api/pickup/request
  GET    /api/pickup
  GET    /api/pickup/{id}
  PATCH  /api/pickup/{id}/accept
  POST   /api/pickup/{id}/verify
"""
from __future__ import annotations

import pytest


VALID_PAYLOAD = {
    "waste_item": "Old laptop charger",
    "category": "e-waste",
    "quantity": 2,
    "address": "Flat 12, Sample Residency, Demo Nagar",
    "preferred_date": None,
    "instructions": "Call at the gate.",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def create_pickup(client, payload=None) -> dict:
    resp = client.post("/api/pickup/request", json=payload or VALID_PAYLOAD)
    assert resp.status_code == 201, resp.text
    return resp.json()


def accept_pickup(client, pickup_id: str) -> dict:
    resp = client.patch(f"/api/pickup/{pickup_id}/accept")
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_pickup_returns_201(client):
    resp = client.post("/api/pickup/request", json=VALID_PAYLOAD)
    assert resp.status_code == 201


def test_create_pickup_has_correct_fields(client):
    body = create_pickup(client)
    assert "pickup_id" in body
    assert body["status"] == "requested"
    assert body["category"] == "e-waste"
    assert body["quantity"] == 2
    assert body["waste_item"] == "Old laptop charger"
    assert body["collector"] is None
    assert body["points_awarded"] is None
    # OTP not present at request time
    assert body.get("otp") is None


def test_create_pickup_persists(client):
    body = create_pickup(client)
    pid = body["pickup_id"]
    detail = client.get(f"/api/pickup/{pid}").json()
    assert detail["pickup_id"] == pid


def test_create_pickup_rejects_short_address(client):
    resp = client.post(
        "/api/pickup/request",
        json={**VALID_PAYLOAD, "address": "Short"},  # 5 chars < 8 min
    )
    assert resp.status_code == 422


def test_create_pickup_rejects_invalid_category(client):
    resp = client.post(
        "/api/pickup/request",
        json={**VALID_PAYLOAD, "category": "nuclear_waste"},
    )
    assert resp.status_code == 422


def test_create_pickup_rejects_zero_quantity(client):
    resp = client.post(
        "/api/pickup/request",
        json={**VALID_PAYLOAD, "quantity": 0},
    )
    assert resp.status_code == 422


def test_create_pickup_rejects_invalid_date(client):
    resp = client.post(
        "/api/pickup/request",
        json={**VALID_PAYLOAD, "preferred_date": "not-a-date"},
    )
    assert resp.status_code == 422


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_pickups_returns_items_and_total(client):
    create_pickup(client)
    resp = client.get("/api/pickup")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) >= 1


def test_list_pickups_status_filter(client):
    create_pickup(client)
    resp = client.get("/api/pickup?status=requested")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert all(p["status"] == "requested" for p in body)


# ── Get detail ────────────────────────────────────────────────────────────────

def test_get_pickup_detail(client):
    pid = create_pickup(client)["pickup_id"]
    resp = client.get(f"/api/pickup/{pid}")
    assert resp.status_code == 200
    assert resp.json()["pickup_id"] == pid


def test_get_pickup_not_found(client):
    resp = client.get("/api/pickup/does-not-exist")
    assert resp.status_code == 404
    assert "detail" in resp.json()


# ── Accept ────────────────────────────────────────────────────────────────────

def test_accept_pickup_changes_status(client):
    pid = create_pickup(client)["pickup_id"]
    body = accept_pickup(client, pid)
    assert body["status"] == "accepted"


def test_accept_pickup_assigns_collector(client):
    pid = create_pickup(client)["pickup_id"]
    body = accept_pickup(client, pid)
    assert body["collector"] is not None
    assert "name" in body["collector"]


def test_accept_pickup_returns_otp_for_citizen_view(client):
    """OTP should be present in the accept response (citizen view)."""
    pid = create_pickup(client)["pickup_id"]
    body = accept_pickup(client, pid)
    # Status accepted → OTP visible to citizen
    assert body.get("otp") is not None
    assert len(body["otp"]) == 6
    assert body["otp"].isdigit()


def test_accept_already_accepted_returns_409(client):
    pid = create_pickup(client)["pickup_id"]
    accept_pickup(client, pid)
    resp = client.patch(f"/api/pickup/{pid}/accept")
    assert resp.status_code == 409


def test_accept_non_existent_pickup_returns_404(client):
    resp = client.patch("/api/pickup/ghost-id/accept")
    assert resp.status_code == 404


# ── Verify ────────────────────────────────────────────────────────────────────

def test_verify_correct_otp_completes_pickup(client):
    pid = create_pickup(client)["pickup_id"]
    otp = accept_pickup(client, pid)["otp"]
    resp = client.post(f"/api/pickup/{pid}/verify", json={"otp": otp})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "collected"
    assert body["verified"] is True
    assert isinstance(body["points_awarded"], int)
    assert body["points_awarded"] > 0


def test_verify_awards_correct_points(client):
    """e-waste × 2 → 30 × 2 = 60 points."""
    pid = create_pickup(client, {**VALID_PAYLOAD, "category": "e-waste", "quantity": 2})["pickup_id"]
    otp = accept_pickup(client, pid)["otp"]
    body = client.post(f"/api/pickup/{pid}/verify", json={"otp": otp}).json()
    assert body["points_awarded"] == 60


def test_verify_wrong_otp_returns_400(client):
    pid = create_pickup(client)["pickup_id"]
    accept_pickup(client, pid)
    resp = client.post(f"/api/pickup/{pid}/verify", json={"otp": "000000"})
    assert resp.status_code == 400
    assert "detail" in resp.json()


def test_verify_already_collected_returns_409(client):
    pid = create_pickup(client)["pickup_id"]
    otp = accept_pickup(client, pid)["otp"]
    # First verify succeeds
    client.post(f"/api/pickup/{pid}/verify", json={"otp": otp})
    # Second verify is a duplicate
    resp = client.post(f"/api/pickup/{pid}/verify", json={"otp": otp})
    assert resp.status_code == 409


def test_verify_not_accepted_pickup_returns_409(client):
    pid = create_pickup(client)["pickup_id"]
    # Still in 'requested' state — cannot verify
    resp = client.post(f"/api/pickup/{pid}/verify", json={"otp": "123456"})
    assert resp.status_code == 409


def test_verify_does_not_award_points_twice(client):
    """Confirm no duplicate point transactions after double-verify attempt."""
    pid = create_pickup(client, {**VALID_PAYLOAD, "quantity": 1, "category": "metal"})["pickup_id"]
    otp = accept_pickup(client, pid)["otp"]
    client.post(f"/api/pickup/{pid}/verify", json={"otp": otp})
    client.post(f"/api/pickup/{pid}/verify", json={"otp": otp})  # should 409

    points_resp = client.get("/api/user/points").json()
    earned = sum(t["points"] for t in points_resp["transactions"])
    # Should only count once: metal × 1 = 10
    assert earned == 10


def test_verify_otp_wrong_format_returns_422(client):
    pid = create_pickup(client)["pickup_id"]
    accept_pickup(client, pid)
    resp = client.post(f"/api/pickup/{pid}/verify", json={"otp": "abc"})
    assert resp.status_code == 422
