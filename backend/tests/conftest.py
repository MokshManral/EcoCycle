"""
Shared pytest fixtures for the EcoCycle test suite.

Strategy:
  - Patch app.database.engine and app.database.SessionLocal BEFORE importing
    the FastAPI app, so the startup lifespan uses the same test engine.
  - Use a shared SQLite file per process (unique temp path per session).
  - Override the get_db dependency to use the same session factory.
  - Drop all tables after each test for isolation.

No real user data or real AI calls are made in tests.
"""
from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# ── Force test environment BEFORE any app import ─────────────────────────────
_db_fd, _db_path = tempfile.mkstemp(suffix=".test.db")
os.close(_db_fd)
TEST_DB_URL = f"sqlite:///{_db_path}"

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["MOCK_CLASSIFIER"] = "true"
os.environ["APP_ENV"] = "test"
os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173"

# ── Create shared test engine ─────────────────────────────────────────────────
from sqlalchemy import create_engine as _ce  # noqa: E402

test_engine = _ce(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(test_engine, "connect")
def _set_pragmas(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


TestingSessionFactory = sessionmaker(
    bind=test_engine, autocommit=False, autoflush=False
)

# ── Monkey-patch app.database to use our test engine ─────────────────────────
# This must happen BEFORE `from app.main import app`
import app.database as _db_module  # noqa: E402

_db_module.engine = test_engine
_db_module.SessionLocal = TestingSessionFactory

# ── Now import the app (lifespan will use the patched engine) ─────────────────
from app.database import Base, get_db  # noqa: E402
from app.main import app               # noqa: E402


def _recreate_schema():
    """Drop and recreate all tables for a clean test run."""
    import app.models  # noqa: F401 — register models with Base
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Provide a fresh database per test function."""
    _recreate_schema()
    session = TestingSessionFactory()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """
    FastAPI TestClient backed by the test database.
    Overrides get_db to use the same session as db_session.
    Seeds demo citizen + collector users.
    """
    def _override_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_db

    # Seed demo users for the test
    from app.models import User, UserRole
    from sqlalchemy import select

    for role, name in [
        (UserRole.CITIZEN, "Test Citizen"),
        (UserRole.COLLECTOR, "Test Collector"),
    ]:
        existing = db_session.execute(
            select(User).where(User.role == role).limit(1)
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(User(display_name=name, role=role))
    db_session.commit()

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


def pytest_sessionfinish(session, exitstatus):
    """Clean up the temp database file after the test session."""
    try:
        test_engine.dispose()
        os.unlink(_db_path)
    except Exception:
        pass
