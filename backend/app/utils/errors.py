"""
HTTP error helpers.

The frontend reads errors as:
  { "detail": "string" }             — plain string
  { "detail": [{ "msg": "..." }] }   — FastAPI validation list

We use FastAPI's built-in HTTPException which produces { "detail": "..." }
automatically, so keep raising HTTPException for all business errors.

Never expose stack traces or internal exception details to the client.
"""
from __future__ import annotations

from fastapi import HTTPException, status


def not_found(resource: str = "Resource") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} not found.",
    )


def conflict(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def bad_request(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message,
    )


def forbidden(message: str = "You are not authorised to perform this action.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message,
    )


def server_error(message: str = "An unexpected error occurred.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=message,
    )


def upload_too_large() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        detail="Uploaded file exceeds the 5 MB size limit.",
    )


def unsupported_media() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
    )
