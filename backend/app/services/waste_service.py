"""
Waste analysis service.

Handles image validation, calls the classifier, persists the analysis record,
and returns the normalized WasteAnalysisResponse.
"""
from __future__ import annotations

import io
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import WasteAnalysis
from app.schemas import WasteAnalysisResponse
from app.services.classifier import classify_waste

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _validate_image(content_type: Optional[str], filename: str, size: int) -> None:
    """
    Validate content type, extension, and file size.
    Raises ValueError with a user-friendly message on failure.
    """
    settings = get_settings()

    # Size check
    if size > settings.MAX_UPLOAD_BYTES:
        raise ValueError(
            f"File is {size // (1024 * 1024):.1f} MB, which exceeds the 5 MB limit."
        )

    # Content-type check (browsers set this; treat as advisory)
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise TypeError(
            f"Unsupported file type '{content_type}'. "
            "Please upload a JPEG, PNG, or WebP image."
        )

    # Extension check (belt-and-suspenders — content type can be spoofed)
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise TypeError(
            "Unsupported file extension. Please upload a JPEG, PNG, or WebP image."
        )


def analyze_waste_image(
    image_bytes: bytes,
    filename: str,
    content_type: Optional[str],
    db: Session,
    user_id: Optional[str] = None,
) -> WasteAnalysisResponse:
    """
    Validate, classify, persist, and return a waste analysis.

    Steps:
      1. Validate file type and size.
      2. Call classifier (mock or real).
      3. Persist result to waste_analyses table.
      4. Return normalized WasteAnalysisResponse.

    Args:
        image_bytes: Raw image bytes from the upload.
        filename: Original filename supplied by the client.
        content_type: MIME type from the multipart header.
        db: SQLAlchemy session (injected by FastAPI).
        user_id: Optional authenticated user ID.

    Returns:
        WasteAnalysisResponse

    Raises:
        ValueError: File size exceeded.
        TypeError: Unsupported file type.
        RuntimeError: Classifier or persistence failure.
    """
    _validate_image(content_type, filename, len(image_bytes))

    # Classify
    try:
        result: WasteAnalysisResponse = classify_waste(image_bytes, filename)
    except Exception as exc:
        logger.exception("Classifier raised an unexpected error for file '%s'", filename)
        raise RuntimeError("Classification failed. Please try again.") from exc

    # Determine recyclable flag from category
    NON_RECYCLABLE = {"organic", "hazardous", "other"}
    recyclable: Optional[bool] = None
    if result.category is not None:
        recyclable = result.category.lower() not in NON_RECYCLABLE

    # Persist analysis record
    try:
        record = WasteAnalysis(
            user_id=user_id,
            item_name=result.item_name,
            category=result.category,
            confidence=result.confidence,
            recyclable=recyclable,
            hazard_warning=result.hazard_warning,
            disposal_method=result.disposal_method,
            recycler_name=result.recycler.name if result.recycler else None,
            recycler_address=result.recycler.address if result.recycler else None,
            estimated_points=result.estimated_points,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info("Persisted WasteAnalysis id=%s category=%s", record.id, record.category)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to persist WasteAnalysis for file '%s'", filename)
        raise RuntimeError("Failed to save analysis. Please try again.") from exc

    return result
