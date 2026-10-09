"""Tests for GET /api/health."""


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_health_content_type_is_json(client):
    response = client.get("/api/health")
    assert "application/json" in response.headers["content-type"]
