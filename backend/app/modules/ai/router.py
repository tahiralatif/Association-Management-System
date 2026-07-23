"""AI Engine routes — API endpoints for AI features."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth import require_admin, require_staff, require_member, TokenPayload
from app.core.database import get_db
from app.modules.ai import crud
from app.modules.ai.schemas import (
    AIHealthResponse,
    AIModelCreate,
    AIModelResponse,
    AIModelUpdate,
    AnomalyRequest,
    AnomalyResponse,
    ChatRequest,
    ChatResponse,
    ConversationHistoryResponse,
    ConversationMessageResponse,
    ChurnPredictionResponse,
    DocumentGenerateRequest,
    DocumentGenerateResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    InsightResponse,
    SearchRequest,
    SearchResponse,
    SearchResponseItem,
)
from app.modules.ai.services import (
    ChurnPredictor,
    AnomalyDetector,
    DocumentGenerator,
    AIInsights,
    embedding_service,
)

router = APIRouter(tags=["AI"])


# ── Churn Prediction ─────────────────────────────────────────

@router.post("/predict/churn/{member_id}", response_model=ChurnPredictionResponse)
async def predict_churn(
    member_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Run churn risk prediction for a specific member."""
    result = await ChurnPredictor.predict_churn_risk(db, user.tenant_id, member_id)
    return result


# ── Anomaly Detection ────────────────────────────────────────

@router.post("/predict/anomalies", response_model=list[AnomalyResponse])
async def detect_anomalies(
    data: AnomalyRequest,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Run anomaly detection on recent financial transactions."""
    results = await AnomalyDetector.detect_financial_anomalies(
        db, user.tenant_id, transactions=None
    )
    return results


# ── Document Generation ──────────────────────────────────────

@router.post("/generate/document", response_model=DocumentGenerateResponse)
async def generate_document(
    data: DocumentGenerateRequest,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Generate a document from a template (meeting minutes, bylaws, etc.)."""
    result = await DocumentGenerator.generate_document(
        user.tenant_id, data.doc_type, data.context
    )
    return result


# ── Embeddings ───────────────────────────────────────────────

@router.post("/embeddings/create", response_model=EmbeddingResponse, status_code=status.HTTP_201_CREATED)
async def create_embedding(
    data: EmbeddingRequest,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Create an embedding for content (enables semantic search)."""
    result = await embedding_service.create_embedding(
        db, user.tenant_id, data.content_id, data.content_type, data.text, data.metadata
    )
    return EmbeddingResponse(
        id=result["id"],
        content_id=result["content_id"],
        content_type=result["content_type"],
        text_chunk=data.text[:500],
        created_at=datetime.now(timezone.utc),
    )


@router.post("/embeddings/search", response_model=SearchResponse)
async def search_embeddings(
    data: SearchRequest,
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search across embeddings."""
    results = await embedding_service.search_similar(
        db, user.tenant_id, data.query, data.content_types, data.limit
    )
    return SearchResponse(
        results=results,
        query=data.query,
        total=len(results),
    )


# ── AI Chat ──────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """AI assistant chat — uses Groq for real responses."""
    from app.core.llm import is_available, chat as llm_chat

    session_id = data.session_id or str(uuid.uuid4())

    # Store user message
    await crud.create_conversation_message(
        db, user.tenant_id, session_id, "user", data.message
    )

    # Build comprehensive AMS context for the AI
    from sqlalchemy import func, select
    from app.modules.members.models import MemberProfile, User
    from app.modules.finances.models import Invoice, Budget, Expense
    from app.modules.events.models import Event
    from app.modules.documents.models import Document
    from app.modules.elections.models import Election
    from app.modules.workflows.models import Workflow

    now = datetime.now(timezone.utc)

    # Gather real stats
    member_count = (await db.execute(select(func.count()).select_from(MemberProfile).where(MemberProfile.tenant_id == user.tenant_id))).scalar() or 0
    active_members = (await db.execute(select(func.count()).select_from(MemberProfile).where(MemberProfile.tenant_id == user.tenant_id, MemberProfile.status == 'active'))).scalar() or 0
    event_count = (await db.execute(select(func.count()).select_from(Event).where(Event.tenant_id == user.tenant_id))).scalar() or 0
    doc_count = (await db.execute(select(func.count()).select_from(Document).where(Document.tenant_id == user.tenant_id))).scalar() or 0
    election_count = (await db.execute(select(func.count()).select_from(Election).where(Election.tenant_id == user.tenant_id))).scalar() or 0
    invoice_count = (await db.execute(select(func.count()).select_from(Invoice).where(Invoice.tenant_id == user.tenant_id))).scalar() or 0
    budget_count = (await db.execute(select(func.count()).select_from(Budget).where(Budget.tenant_id == user.tenant_id))).scalar() or 0
    workflow_count = (await db.execute(select(func.count()).select_from(Workflow).where(Workflow.tenant_id == user.tenant_id))).scalar() or 0
    total_revenue = (await db.execute(select(func.coalesce(func.sum(Invoice.total), 0)).where(Invoice.tenant_id == user.tenant_id))).scalar() or 0
    total_paid = (await db.execute(select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(Invoice.tenant_id == user.tenant_id))).scalar() or 0
    expense_count = (await db.execute(select(func.count()).select_from(Expense).where(Expense.tenant_id == user.tenant_id))).scalar() or 0

    ams_context = f"""
You are the AI assistant for **AssocHub** — an Association Management System (AMS).
You have REAL-TIME access to the association's data. Answer questions accurately using the data below.
If you don't have the exact data to answer, say what you CAN do and suggest the right module.

## Current Association Data (live from database)
- Total Members: {member_count} (Active: {active_members})
- Events: {event_count}
- Documents: {doc_count}
- Elections: {election_count}
- Invoices: {invoice_count}
- Budgets: {budget_count}
- Workflows: {workflow_count}
- Total Revenue: ${total_revenue:,.2f}
- Total Paid: ${total_paid:,.2f}
- Outstanding: ${float(total_revenue) - float(total_paid):,.2f}
- Expenses: {expense_count}

## System Modules
You can help users with any of these modules:

1. **Members** — View, add, edit members. Check status (active/pending/suspended/lapsed/cancelled). Manage groups and tags. Track member notes.
2. **Finances** — Invoices (create/send/mark paid), Budgets (track spending), Expenses (submit/approve), Dues (membership fees), Payments. Dashboard with revenue overview.
3. **Events** — Create/manage events with sessions, speakers, registrations, and feedback. Check-in attendees.
4. **Documents** — Upload, share, version control. Add comments. Organize by category.
5. **Elections** — Create elections with positions, nominations, voting, and results.
6. **Workflows** — Automate tasks with triggers and conditions. Run workflow instances.
7. **Communications** — Announcements, email campaigns, templates, notifications, surveys.
8. **Analytics** — KPIs, insights, custom dashboards, reports, exports.
9. **AI Features** — Churn prediction, anomaly detection, semantic search, document generation.

## How to Help
- When asked about data, use the real numbers above
- When asked HOW to do something, give step-by-step instructions for the right module
- When asked to ANALYZE something, use the financial/member data to provide insights
- Always be specific and actionable
- If a user asks about a feature, explain what it does and how to use it
- Keep responses concise but thorough
- Use markdown formatting for readability
"""

    # Fetch recent conversation history for context
    history = await crud.get_conversation_history(db, user.tenant_id, session_id)
    messages = [{"role": "system", "content": ams_context}]
    # Include last 10 messages for context
    for msg in history[-10:]:
        role = "assistant" if str(msg.role) == "assistant" else "user"
        messages.append({"role": role, "content": msg.content})
    messages.append({"role": "user", "content": data.message})

    if is_available():
        reply_text = llm_chat(messages, temperature=0.7, max_tokens=1024)
        reply = reply_text or "I couldn't generate a response. Please try again."
        model_used = settings.GROQ_MODEL or settings.LLM_MODEL
        tokens_used = sum(len(m["content"].split()) for m in messages) + len(reply.split())
        suggestions = []  # LLM could generate these, but keeping it simple
    else:
        reply = (
            "AI chat is in demo mode — no API key configured. "
            "Set GROQ_API_KEY to enable real AI responses."
        )
        model_used = "rule-based"
        tokens_used = len(data.message.split())
        suggestions = [
            "Check member engagement",
            "Run churn prediction",
            "Search the knowledge base",
        ]

    # Store assistant reply
    await crud.create_conversation_message(
        db, user.tenant_id, session_id, "assistant", reply,
        tokens_used=tokens_used, model_used=model_used,
    )

    return ChatResponse(
        reply=reply,
        tokens_used=tokens_used,
        model=model_used,
        suggestions=suggestions,
        session_id=session_id,
    )


# ── AI Insights ──────────────────────────────────────────────

@router.get("/insights", response_model=list[InsightResponse])
async def get_insights(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Generate cross-module AI insights."""
    insights = await AIInsights.generate_insights(db, user.tenant_id)
    return insights


# ── Model Registry ───────────────────────────────────────────

@router.get("/models", response_model=list[AIModelResponse])
async def list_models(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List all registered AI models."""
    models = await crud.list_models(db, user.tenant_id)
    return [AIModelResponse.model_validate(m) for m in models]


@router.post("/models", response_model=AIModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    data: AIModelCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Register a new AI model."""
    model = await crud.create_model(db, user.tenant_id, data.model_dump())
    return AIModelResponse.model_validate(model)


@router.patch("/models/{model_id}", response_model=AIModelResponse)
async def update_model(
    model_id: str,
    data: AIModelUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an AI model's metadata."""
    updates = data.model_dump(exclude_unset=True)
    model = await crud.update_model(db, model_id, user.tenant_id, updates)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return AIModelResponse.model_validate(model)


# ── Conversation History ─────────────────────────────────────

@router.get("/conversations/{session_id}", response_model=ConversationHistoryResponse)
async def get_conversation(
    session_id: str,
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session."""
    messages = await crud.get_conversation_history(db, user.tenant_id, session_id)
    total_tokens = sum(m.tokens_used for m in messages)

    return ConversationHistoryResponse(
        session_id=session_id,
        messages=[
            ConversationMessageResponse(
                id=m.id,
                role=str(m.role),
                content=m.content,
                tokens_used=m.tokens_used,
                model_used=m.model_used,
                created_at=m.created_at,
            )
            for m in messages
        ],
        total_tokens=total_tokens,
    )


# ── Health Check ─────────────────────────────────────────────

@router.get("/health", response_model=AIHealthResponse)
async def ai_health(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """AI engine health check — what's available and what's not."""
    from app.core.llm import is_available as llm_available
    llm_on = llm_available()

    model_count = len(await crud.list_models(db, user.tenant_id))
    embedding_count = await crud.count_embeddings(db, user.tenant_id)

    return AIHealthResponse(
        status="healthy",
        llm_available=llm_on,
        embedding_available=True,  # TF-IDF/hash fallback always available
        vector_store_available=True,  # pgvector always available
        model_count=model_count,
        embedding_count=embedding_count,
        features={
            "churn_prediction": True,       # rule-based, always works
            "anomaly_detection": True,      # statistical, always works
            "document_generation": True,    # template always works, LLM optional
            "semantic_search": True,        # hash fallback always works
            "ai_chat": llm_on,              # needs LLM API key
            "insights": True,               # statistical, always works
        },
    )
