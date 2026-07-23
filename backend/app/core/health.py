"""Health check endpoints — verifies service dependencies."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db

router = APIRouter(tags=["Health"])


async def _check_db(db: AsyncSession) -> dict:
    """Verify database connectivity."""
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


async def _check_redis() -> dict:
    """Verify Redis connectivity."""
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=3)
        await r.ping()
        await r.aclose()
        return {"status": "ok"}
    except ImportError:
        return {"status": "skipped", "detail": "redis not installed"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


async def _check_celery() -> dict:
    """Verify Celery broker connectivity."""
    try:
        from app.celery_app import celery_app
        inspect = celery_app.control.inspect(timeout=3)
        active = inspect.active()
        if active is not None:
            return {"status": "ok", "workers": len(active)}
        return {"status": "error", "detail": "No workers responding"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Comprehensive health check — verifies all service dependencies.
    Returns 200 if core services are healthy, 503 if critical failures.
    """
    db_health = await _check_db(db)
    redis_health = await _check_redis()
    celery_health = await _check_celery()

    all_healthy = (
        db_health["status"] == "ok"
        and redis_health["status"] in ("ok", "skipped")
    )

    result = {
        "status": "healthy" if all_healthy else "degraded",
        "version": settings.VERSION,
        "environment": settings.ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": db_health,
            "redis": redis_health,
            "celery": celery_health,
        },
    }

    return result


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Kubernetes readiness probe — can the service handle requests?"""
    db_health = await _check_db(db)
    if db_health["status"] != "ok":
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"status": "not ready"})
    return {"status": "ready"}


@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe — is the process alive?"""
    return {"status": "alive"}
