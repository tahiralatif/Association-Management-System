"""AI Engine CRUD — database operations for AI models, embeddings, predictions, and conversations."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, text, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.models import (
    AIConversation,
    AIEmbedding,
    AIModel,
    AIPrediction,
    ConversationRole,
    ContentType,
    PredictionType,
)


# ── AI Model Operations ──────────────────────────────────────

async def list_models(db: AsyncSession, tenant_id: str) -> list[AIModel]:
    result = await db.execute(
        select(AIModel)
        .where(AIModel.tenant_id == tenant_id)
        .order_by(AIModel.created_at.desc())
    )
    return list(result.scalars().all())


async def get_model(db: AsyncSession, model_id: str, tenant_id: str) -> AIModel | None:
    result = await db.execute(
        select(AIModel).where(AIModel.id == model_id, AIModel.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def create_model(db: AsyncSession, tenant_id: str, data: dict) -> AIModel:
    model = AIModel(tenant_id=tenant_id, **data)
    db.add(model)
    await db.flush()
    return model


async def update_model(db: AsyncSession, model_id: str, tenant_id: str, updates: dict) -> AIModel | None:
    model = await get_model(db, model_id, tenant_id)
    if not model:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(model, key):
            setattr(model, key, value)
    await db.flush()
    return model


# ── Embedding Operations ─────────────────────────────────────

async def create_embedding(
    db: AsyncSession,
    tenant_id: str,
    content_id: str,
    content_type: str,
    text_chunk: str,
    embedding: list[float],
    metadata_json: dict | None = None,
) -> AIEmbedding:
    emb = AIEmbedding(
        tenant_id=tenant_id,
        content_id=content_id,
        content_type=ContentType(content_type),
        text_chunk=text_chunk,
        embedding=embedding,
        metadata_json=metadata_json or {},
    )
    db.add(emb)
    await db.flush()
    return emb


async def search_embeddings(
    db: AsyncSession,
    tenant_id: str,
    query_embedding: list[float],
    content_types: list[str] | None = None,
    limit: int = 10,
) -> list[dict]:
    """Cosine similarity search via pgvector <=> operator."""
    # Build the cosine distance query
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    query = (
        select(
            AIEmbedding.content_id,
            AIEmbedding.content_type,
            AIEmbedding.text_chunk,
            AIEmbedding.metadata_json,
            AIEmbedding.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .where(AIEmbedding.tenant_id == tenant_id)
    )

    if content_types:
        query = query.where(AIEmbedding.content_type.in_(content_types))

    query = query.order_by("distance").limit(limit)

    result = await db.execute(query)
    rows = result.all()

    results = []
    for row in rows:
        # Convert cosine distance to similarity score (1 - distance)
        score = max(0.0, 1.0 - float(row.distance))
        results.append({
            "content_id": row.content_id,
            "content_type": str(row.content_type),
            "text": row.text_chunk,
            "score": round(score, 4),
            "metadata": row.metadata_json,
        })

    return results


async def get_embeddings_by_content(
    db: AsyncSession, tenant_id: str, content_id: str, content_type: str
) -> list[AIEmbedding]:
    result = await db.execute(
        select(AIEmbedding).where(
            AIEmbedding.tenant_id == tenant_id,
            AIEmbedding.content_id == content_id,
            AIEmbedding.content_type == ContentType(content_type),
        )
    )
    return list(result.scalars().all())


async def delete_embeddings_for_content(
    db: AsyncSession, tenant_id: str, content_id: str, content_type: str
) -> int:
    result = await db.execute(
        delete(AIEmbedding).where(
            AIEmbedding.tenant_id == tenant_id,
            AIEmbedding.content_id == content_id,
            AIEmbedding.content_type == ContentType(content_type),
        )
    )
    await db.flush()
    return result.rowcount


async def count_embeddings(db: AsyncSession, tenant_id: str) -> int:
    result = await db.execute(
        select(func.count()).select_from(AIEmbedding).where(AIEmbedding.tenant_id == tenant_id)
    )
    return result.scalar() or 0


async def delete_old_embeddings(db: AsyncSession, tenant_id: str, days: int = 90) -> int:
    """Delete embeddings older than N days."""
    cutoff = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=days)
    result = await db.execute(
        delete(AIEmbedding).where(
            AIEmbedding.tenant_id == tenant_id,
            AIEmbedding.created_at < cutoff,
        )
    )
    await db.flush()
    return result.rowcount


# ── Prediction Operations ────────────────────────────────────

async def create_prediction(
    db: AsyncSession,
    tenant_id: str,
    entity_id: str,
    entity_type: str,
    prediction_type: str,
    confidence: float,
    result: dict,
    model_id: str | None = None,
) -> AIPrediction:
    pred = AIPrediction(
        tenant_id=tenant_id,
        model_id=model_id,
        entity_id=entity_id,
        entity_type=entity_type,
        prediction_type=PredictionType(prediction_type),
        confidence=confidence,
        result=result,
    )
    db.add(pred)
    await db.flush()
    return pred


async def get_predictions_for_entity(
    db: AsyncSession, tenant_id: str, entity_id: str, entity_type: str
) -> list[AIPrediction]:
    result = await db.execute(
        select(AIPrediction)
        .where(
            AIPrediction.tenant_id == tenant_id,
            AIPrediction.entity_id == entity_id,
            AIPrediction.entity_type == entity_type,
        )
        .order_by(AIPrediction.created_at.desc())
    )
    return list(result.scalars().all())


async def get_predictions_by_type(
    db: AsyncSession, tenant_id: str, prediction_type: str, limit: int = 50
) -> list[AIPrediction]:
    result = await db.execute(
        select(AIPrediction)
        .where(AIPrediction.tenant_id == tenant_id, AIPrediction.prediction_type == prediction_type)
        .order_by(AIPrediction.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Conversation Operations ──────────────────────────────────

async def create_conversation_message(
    db: AsyncSession,
    tenant_id: str,
    session_id: str,
    role: str,
    content: str,
    tokens_used: int = 0,
    model_used: str | None = None,
    metadata_json: dict | None = None,
) -> AIConversation:
    msg = AIConversation(
        tenant_id=tenant_id,
        session_id=session_id,
        role=ConversationRole(role),
        content=content,
        tokens_used=tokens_used,
        model_used=model_used,
        metadata_json=metadata_json or {},
    )
    db.add(msg)
    await db.flush()
    return msg


async def get_conversation_history(
    db: AsyncSession, tenant_id: str, session_id: str, limit: int = 50
) -> list[AIConversation]:
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.tenant_id == tenant_id, AIConversation.session_id == session_id)
        .order_by(AIConversation.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def count_conversations(db: AsyncSession, tenant_id: str) -> int:
    result = await db.execute(
        select(func.count(func.distinct(AIConversation.session_id)))
        .where(AIConversation.tenant_id == tenant_id)
    )
    return result.scalar() or 0
