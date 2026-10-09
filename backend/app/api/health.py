"""GET /api/health — liveness check."""
from fastapi import APIRouter
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Return 200 OK to confirm the backend is running."""
    return HealthResponse(status="ok")
