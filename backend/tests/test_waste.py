"""
Tests for POST /api/waste/analyze.

All tests use the mock classifier (MOCK_CLASSIFIER=true).
"""
from __future__ import annotations

import io


def _make_image_file(filename: str = "bottle.jpg", size: int = 1024) -> bytes:
    """Create minimal JPEG-like bytes for testing."""
    return b"\xff\xd8\xff" + b"\x00" * (size - 3)


# ── Valid uploads ──────────────────────────────────────────────────────────────

def test_analyze_returns_expected_fields(client):
    data = _make_image_file("bottle.jpg")
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("bottle.jpg", io.BytesIO(data), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    # All required fields present
    assert "item_name" in body
    assert "category" in body
    assert "confidence" in body
    assert "hazard_warning" in body
    assert "disposal_method" in body
    assert "recycler" in body
    assert "estimated_points" in body


def test_analyze_plastic_bottle(client):
    data = _make_image_file("bottle.jpg")
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("bottle.jpg", io.BytesIO(data), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "plastic"
    assert body["confidence"] > 0.6
    assert body["item_name"] is not None
    assert isinstance(body["estimated_points"], int)


def test_analyze_battery_returns_hazard_warning(client):
    data = _make_image_file("battery.jpg")
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("battery.jpg", io.BytesIO(data), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "hazardous"
    assert body["hazard_warning"] is not None and len(body["hazard_warning"]) > 0


def test_analyze_unknown_image_returns_null_fields(client):
    data = _make_image_file("unknown_item.jpg")
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("unknown_item.jpg", io.BytesIO(data), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["category"] is None
    assert body["confidence"] is None


def test_analyze_png_is_accepted(client):
    data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("image.png", io.BytesIO(data), "image/png")},
    )
    assert response.status_code == 200


# ── Invalid uploads ────────────────────────────────────────────────────────────

def test_analyze_rejects_pdf(client):
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert response.status_code == 415


def test_analyze_rejects_oversized_file(client):
    big_data = b"\xff\xd8\xff" + b"\x00" * (6 * 1024 * 1024)  # 6 MB
    response = client.post(
        "/api/waste/analyze",
        files={"file": ("big.jpg", io.BytesIO(big_data), "image/jpeg")},
    )
    assert response.status_code == 413


def test_analyze_requires_file_field(client):
    response = client.post("/api/waste/analyze")
    assert response.status_code == 422  # FastAPI validation error
