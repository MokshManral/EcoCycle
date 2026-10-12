"""
EcoCycle FastAPI application entry point.

Startup sequence:
  1. Load configuration from .env
  2. Create database tables
  3. Seed demo users (citizen + collector) for MVP
  4. Mount API routers under /api
  5. Configure CORS for the frontend origin(s)

Run with:
    cd backend
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, impact, pickups, users, waste
from app.core.config import get_settings
from app.database import SessionLocal, create_all_tables

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ── Demo seed data ─────────────────────────────────────────────────────────────

def _seed_demo_users() -> None:
    """
    Ensure demo citizen and collector users exist in the database.
    This is MVP scaffolding — replace with real auth in production.
    """
    from app.models import User, UserRole
    from sqlalchemy import select

    db = SessionLocal()
    try:
        for role, name in [
            (UserRole.CITIZEN, "Demo Citizen"),
            (UserRole.COLLECTOR, "Demo Collector"),
            (UserRole.ADMIN, "Demo Admin"),
        ]:
            stmt = select(User).where(User.role == role).limit(1)
            existing = db.execute(stmt).scalar_one_or_none()
            if existing is None:
                user = User(display_name=name, role=role)
                db.add(user)
                logger.info("Seeded demo user: role=%s name='%s'", role, name)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to seed demo users")
    finally:
        db.close()


# ── Application lifespan ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before the first request, cleanup on shutdown."""
    settings = get_settings()
    logger.info("Starting EcoCycle backend — env=%s", settings.APP_ENV)
    logger.info("Database: %s", settings.DATABASE_URL.split("@")[-1])  # redact credentials

    create_all_tables()
    logger.info("Database tables ready")

    _seed_demo_users()

    if settings.MOCK_CLASSIFIER:
        logger.warning(
            "⚠  MOCK_CLASSIFIER=true — AI responses are simulated. "
            "Set MOCK_CLASSIFIER=false to use the real AI module."
        )

    yield  # application runs here

    logger.info("EcoCycle backend shutting down")


# ── App instance ───────────────────────────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title="EcoCycle API",
    description=(
        "Backend for the EcoCycle waste segregation and recycling platform. "
        "See /docs for the interactive API explorer."
    ),
    version="1.0.0",
    lifespan=lifespan,
    # OpenAPI served at /docs and /redoc
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow the frontend dev server and preview server to call the API.
# In production, set FRONTEND_ORIGINS to the deployed frontend URL(s) only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(waste.router, prefix=API_PREFIX)
app.include_router(pickups.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(impact.router, prefix=API_PREFIX)
