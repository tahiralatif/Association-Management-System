"""AI Engine models — ML models, embeddings, predictions, and conversations."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Float, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class ModelType(str, enum.Enum):
    CHURN_PREDICTION = "churn_prediction"
    ANOMALY_DETECTION = "anomaly_detection"
    RECOMMENDATION = "recommendation"
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CUSTOM = "custom"


class PredictionType(str, enum.Enum):
    CHURN_RISK = "churn_risk"
    ANOMALY = "anomaly"
    RECOMMENDATION = "recommendation"
    CLASSIFICATION = "classification"
    SCORING = "scoring"


class ContentType(str, enum.Enum):
    MEMBER = "member"
    DOCUMENT = "document"
    EVENT = "event"
    TRANSACTION = "transaction"
    COMMUNICATION = "communication"
    POLICY = "policy"
    CUSTOM = "custom"


class ConversationRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ── AI Model Registry ────────────────────────────────────────

class AIModel(Base):
    """Tracks deployed ML models and their metadata."""
    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    version: Mapped[str] = mapped_column(String(50))
    model_type: Mapped[ModelType] = mapped_column(Enum(ModelType))
    description: Mapped[str | None] = mapped_column(Text)

    # Configuration & metrics
    config: Mapped[dict | None] = mapped_column(JSON, default={})
    # e.g. {"algorithm": "gradient_boost", "features": [...], "hyperparameters": {...}}
    metrics: Mapped[dict | None] = mapped_column(JSON, default={})
    # e.g. {"accuracy": 0.92, "f1_score": 0.89, "training_date": "..."}

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Embedding Vector Store ──────────────────────────────────

class AIEmbedding(Base):
    """Vector store for semantic search over documents and members."""
    __tablename__ = "ai_embeddings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    content_id: Mapped[str] = mapped_column(String(64), index=True)
    content_type: Mapped[ContentType] = mapped_column(Enum(ContentType), index=True)
    text_chunk: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(Vector(1536))
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default={})

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Prediction Results ───────────────────────────────────────

class AIPrediction(Base):
    """Stores prediction results from ML models."""
    __tablename__ = "ai_predictions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    model_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), index=True)
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)  # "member", "transaction", etc.
    prediction_type: Mapped[PredictionType] = mapped_column(Enum(PredictionType))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    result: Mapped[dict] = mapped_column(JSON, default={})
    # e.g. {"risk_score": 0.85, "risk_factors": [...], "recommendation": "..."}

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Chat / Assistant History ─────────────────────────────────

class AIConversation(Base):
    """Chat history for the AI assistant."""
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    session_id: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[ConversationRole] = mapped_column(Enum(ConversationRole))
    content: Mapped[str] = mapped_column(Text)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    model_used: Mapped[str | None] = mapped_column(String(100))
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default={})

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
