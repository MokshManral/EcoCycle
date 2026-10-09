"""
Database engine and session factory.
Supports both SQLite (development) and PostgreSQL (production).
"""
from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


def _make_engine():
    settings = get_settings()
    url = settings.DATABASE_URL

    if url.startswith("sqlite"):
        # SQLite needs check_same_thread disabled for FastAPI's thread model
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=settings.is_development,
        )
        # Enable WAL mode and foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def _configure_sqlite(dbapi_conn, _):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    else:
        engine = create_engine(url, echo=settings.is_development)

    return engine


engine = _make_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def get_db():
    """FastAPI dependency — yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all tables defined by ORM models (used in startup and tests)."""
    # Import models here to ensure they are registered with Base
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
