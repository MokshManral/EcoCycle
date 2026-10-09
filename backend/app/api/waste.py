"""
POST /api/waste/analyze — receive an image, return AI classification results.

The frontend sends:
    POST /api/waste/analyze
    Content-Type: multipart/form-data
    Body: file=<image>   (field name is 'file' — confirmed from frontend api.js)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import WasteAnalysisResponse
from app.services.waste_service import analyze_waste_image
from app.utils.errors import bad_request, server_error, unsupported_media, upload_too_large

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/waste/analyze",
    response_model=WasteAnalysisResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste"],
    summary="Analyze a waste image",
    description=(
        "Upload an image (JPEG, PNG, or WebP, max 5 MB) and receive an AI classification "
        "with category, confidence, disposal method, and estimated recycling points."
    ),
)
async def analyze_waste(
    file: UploadFile = File(..., description="Image file to classify"),
    db: Session = Depends(get_db),
) -> WasteAnalysisResponse:
    """
    Validate the upload, run the classifier, persist the result, and return the analysis.

    Field name is 'file' — this matches the frontend FormData.append('file', file) call.
    """
    # Read upload into memory (streams are safer than passing UploadFile to sync code)
    image_bytes = await file.read()
    filename = file.filename or "upload"
    content_type = file.content_type

    try:
        result = analyze_waste_image(
            image_bytes=image_bytes,
            filename=filename,
            content_type=content_type,
            db=db,
        )
    except ValueError as exc:
        # File too large
        raise upload_too_large() from exc
    except TypeError as exc:
        # Unsupported file type
        raise unsupported_media() from exc
    except RuntimeError as exc:
        logger.error("Waste analysis failed: %s", exc)
        raise server_error(str(exc)) from exc

    return result
