"""
Application configuration — loaded from environment variables / .env file.
Never hardcode secrets here.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./EcoCycle.db"

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-development-only"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Stored as a comma-separated string in the env file
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    # ── AI Classifier ─────────────────────────────────────────────────────────
    MOCK_CLASSIFIER: bool = True
    OPENAI_API_KEY: str = ""

    # ── AWS credentials (shared by Rekognition + Bedrock / Strands) ────────────
    # Leave blank to fall back to the standard boto3 credential chain:
    #   env vars → ~/.aws/credentials → EC2/ECS IAM role
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # ── Strands Agents / AWS Bedrock ───────────────────────────────────────────
    # Claude Opus 4.8 — multimodal (vision), active, available in all major regions.
    # Model IDs (no -v1 suffix starting from Opus 4.7+):
    #   anthropic.claude-opus-4-8   ← latest (recommended)
    #   anthropic.claude-opus-4-7   ← previous
    # With geo-inference prefix for US cross-region failover:
    #   us.anthropic.claude-opus-4-8
    # Docs: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html
    # NOTE: Opus 4.7+ does NOT support temperature, top_p, or top_k parameters.
    BEDROCK_MODEL_ID: str = "anthropic.claude-opus-4-8"

    # ── AWS Rekognition (kept as a fallback / hybrid option) ──────────────────
    REKOGNITION_MIN_CONFIDENCE: float = 60.0
    REKOGNITION_MAX_LABELS: int = 20

    # ── Uploads ───────────────────────────────────────────────────────────────
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024  # 5 MB

    # ── Derived ───────────────────────────────────────────────────────────────
    @property
    def allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
