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
    """Retrain churn prediction model for a tenant using scikit-learn."""
    import asyncio

    async def _train():
        from app.core.database import async_session_factory
        from app.ai.ml.churn import train_model

        async with async_session_factory() as db:
            metrics = await train_model(db, tenant_id)
            return metrics

    return asyncio.get_event_loop().run_until_complete(_train())


@shared_task
def batch_churn_predictions(tenant_id: str):
    """Run batch churn predictions for all members in a tenant."""
    import asyncio

    async def _predict():
        from app.core.database import async_session_factory
        from app.ai.ml.churn import batch_predict_all

        async with async_session_factory() as db:
            results = await batch_predict_all(db, tenant_id)
            summary = {
                "total": len(results),
                "critical": sum(1 for r in results if r["risk_level"] == "critical"),
                "high": sum(1 for r in results if r["risk_level"] == "high"),
                "medium": sum(1 for r in results if r["risk_level"] == "medium"),
                "low": sum(1 for r in results if r["risk_level"] == "low"),
            }
            return {"predictions": len(results), "summary": summary}

    return asyncio.get_event_loop().run_until_complete(_predict())


@shared_task
def calculate_all_engagement_scores(tenant_id: str):
    """Calculate engagement scores for all members in a tenant."""
    import asyncio

    async def _calculate():
        from app.core.database import async_session_factory
        from app.ai.ml.engagement import calculate_all_engagement_scores

        async with async_session_factory() as db:
            stats = await calculate_all_engagement_scores(db, tenant_id)
            return stats

    return asyncio.get_event_loop().run_until_complete(_calculate())


@shared_task
def run_member_segmentation(tenant_id: str):
    """Run smart member segmentation for a tenant."""
    import asyncio

    async def _segment():
        from app.core.database import async_session_factory
        from app.ai.ml.segmentation import segment_all_members

        async with async_session_factory() as db:
            result = await segment_all_members(db, tenant_id)
            summary = result["summary"]
            return summary

    return asyncio.get_event_loop().run_until_complete(_segment())
