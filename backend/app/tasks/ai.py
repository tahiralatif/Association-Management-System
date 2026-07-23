"""AI-related background tasks."""

from celery import shared_task


@shared_task
def cleanup_old_embeddings():
    """Remove embeddings older than 90 days to save storage."""
    import asyncio
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import delete, select, func
    from app.core.database import async_session_factory
    from app.modules.ai.models import AIEmbedding

    async def _cleanup():
        async with async_session_factory() as db:
            cutoff = datetime.now(timezone.utc) - timedelta(days=90)
            result = await db.execute(
                delete(AIEmbedding).where(AIEmbedding.created_at < cutoff)
            )
            await db.commit()
            return {"deleted": result.rowcount}

    return asyncio.get_event_loop().run_until_complete(_cleanup())


@shared_task
def batch_embed_content(tenant_id: str, content_items: list[dict]):
    """Batch create embeddings for content items."""
    import asyncio

    async def _batch():
        from app.core.database import async_session_factory
        from app.modules.ai.services import EmbeddingService

        async with async_session_factory() as db:
            service = EmbeddingService()
            created = 0
            for item in content_items:
                await service.create_embedding(
                    db, tenant_id,
                    item["content_id"], item["content_type"], item["text"],
                    item.get("metadata", {})
                )
                created += 1
            await db.commit()
            return {"embedded": created}

    return asyncio.get_event_loop().run_until_complete(_batch())


@shared_task
def train_churn_model(tenant_id: str):
    """Retrain churn prediction model for a tenant."""
    # Placeholder for actual ML training pipeline
    return {"tenant_id": tenant_id, "status": "model_retrained"}
