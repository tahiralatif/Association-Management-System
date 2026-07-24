"""Application configuration via environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # General
    ENV: str = "development"
    DEBUG: bool = True
    VERSION: str = "0.1.0"
    SECRET_KEY: str = "change-me-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://assochub:assochub@localhost:5432/assochub"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "https://ams.14.jugaar.ai"]

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    # LLM / AI (Groq — OpenAI-compatible)
    LLM_PROVIDER: str = "openrouter"  # openrouter, groq, openai, local
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "meta-llama/llama-3.1-8b-instruct"
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Embeddings (Groq does NOT support embeddings — use hash fallback)
    EMBEDDING_MODEL: str = "hash-fallback"
    EMBEDDING_DIMENSIONS: int = 1536
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # Meilisearch
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_MASTER_KEY: str = ""

    # S3 / File Storage
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "assochub"
    S3_REGION: str = "us-east-1"

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@assochub.com"
    EMAIL_FROM: str = "noreply@assochub.com"
    EMAIL_FROM_NAME: str = "AssocHub"
    EMAIL_PROVIDER: str = "smtp"  # smtp, sendgrid, ses, resend
    # EMAIL_MAX_RETRIES: int = 3  # For future use

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
