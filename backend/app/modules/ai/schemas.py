"""AI Engine schemas — Pydantic models for requests and responses."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ── Model Registry Schemas ───────────────────────────────────

class AIModelBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    version: str = Field(min_length=1, max_length=50)
    model_type: str
    description: str | None = None
    config: dict | None = None
    metrics: dict | None = None
    is_active: bool = True


class AIModelCreate(AIModelBase):
    pass


class AIModelUpdate(BaseModel):
    name: str | None = None
    version: str | None = None
    model_type: str | None = None
    description: str | None = None
    config: dict | None = None
    metrics: dict | None = None
    is_active: bool | None = None


class AIModelResponse(AIModelBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Embedding Schemas ────────────────────────────────────────

class EmbeddingRequest(BaseModel):
    content_id: str
    content_type: str
    text: str = Field(min_length=1)
    metadata: dict | None = None


class EmbeddingResponse(BaseModel):
    id: str
    content_id: str
    content_type: str
    text_chunk: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Search Schemas ───────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    content_types: list[str] | None = None
    limit: int = Field(default=10, ge=1, le=100)


class SearchResponseItem(BaseModel):
    model_config = {"from_attributes": True}

    content_id: str
    content_type: str
    text: str
    score: float
    metadata: dict | None = None


class SearchResponse(BaseModel):
    model_config = {"from_attributes": True}

    results: list[SearchResponseItem]
    query: str
    total: int


# ── Churn Prediction Schemas ─────────────────────────────────

class ChurnPredictionResponse(BaseModel):
    model_config = {"from_attributes": True}

    member_id: str
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_factors: list[str]
    recommendation: str
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


# ── Anomaly Detection Schemas ────────────────────────────────

class AnomalyRequest(BaseModel):
    transaction_ids: list[str] | None = None  # If None, analyze recent transactions
    lookback_days: int = Field(default=90, ge=1, le=365)


class AnomalyResponse(BaseModel):
    model_config = {"from_attributes": True}

    transaction_id: str
    anomaly_type: str
    severity: str
    description: str
    amount: float


# ── Document Generation Schemas ──────────────────────────────

class DocumentGenerateRequest(BaseModel):
    doc_type: str = Field(description="meeting_minutes, bylaws_amendment, resolution, financial_summary")
    context: dict | str = Field(description="Context data for generation")
    template_id: str | None = None


class DocumentGenerateResponse(BaseModel):
    model_config = {"from_attributes": True}

    content: str
    summary: str
    key_points: list[str]
    confidence: float


# ── Chat Schemas ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: str | None = None
    context: dict | None = None


class ChatResponse(BaseModel):
    model_config = {"from_attributes": True}

    reply: str
    tokens_used: int
    model: str
    suggestions: list[str] = []
    session_id: str


# ── Insight Schemas ──────────────────────────────────────────

class InsightResponse(BaseModel):
    model_config = {"from_attributes": True}

    insight_type: str
    title: str
    description: str
    severity: str
    data: dict | None = None
    actionable: bool = False
    action_url: str | None = None


# ── Conversation History Schemas ─────────────────────────────

class ConversationMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    tokens_used: int
    model_used: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationHistoryResponse(BaseModel):
    model_config = {"from_attributes": True}

    session_id: str
    messages: list[ConversationMessageResponse]
    total_tokens: int


# ── Health Check ─────────────────────────────────────────────

class AIHealthResponse(BaseModel):
    model_config = {"from_attributes": True}

    status: str
    llm_available: bool
    embedding_available: bool
    vector_store_available: bool
    model_count: int
    embedding_count: int
    features: dict[str, bool]
