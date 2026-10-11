"""
Application configuration — loaded from environment variables / .env file.
Never hardcode secrets here.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(__file__), "..", "..", ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "sqlite:///./EcoCycle.db"

    # Application
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-development-only"

    # CORS
    FRONTEND_ORIGINS: str = (
        "http://localhost:5173,http://localhost:4173"
    )

    # AI classifier
    MOCK_CLASSIFIER: bool = True
    OPENAI_API_KEY: str = ""

    # AWS credentials
    # Prefer the standard boto3 credential chain:
    # environment variables, ~/.aws/credentials, or IAM roles.
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"

    # AWS Bedrock / Strands
    BEDROCK_MODEL_ID: str = (
        "global.anthropic.claude-haiku-4-5-20251001-v1:0"
    )

    # AWS Rekognition
    REKOGNITION_MIN_CONFIDENCE: float = 60.0
    REKOGNITION_MAX_LABELS: int = 20

    # Uploads
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024  # 5 MB

    # Derived settings
    @property
    def allowed_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.FRONTEND_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
