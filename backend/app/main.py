"""AssocHub — AI-Powered Association Management System"""

import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.core.middleware.tenant import TenantMiddleware
from app.core.middleware.audit import AuditMiddleware
from app.core.middleware.request_id import RequestIDMiddleware
from app.core.middleware.rate_limit import limiter
from app.core.exceptions.handlers import register_exception_handlers
from app.core.health import router as health_router
from app.core.auth.router import router as auth_router
from app.modules.members.router import router as members_router
from app.modules.finances.router import router as finances_router
from app.modules.events.router import router as events_router
from app.modules.communications.router import router as communications_router
from app.modules.elections.router import router as elections_router
from app.modules.documents.router import router as documents_router
from app.modules.analytics.router import router as analytics_router
from app.modules.workflows.router import router as workflows_router
from app.modules.ai.router import router as ai_router
from app.modules.integrations.router import router as integrations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.ConsoleRenderer() if settings.DEBUG else structlog.processors.JSONRenderer(),
        ]
    )
    logger = structlog.get_logger("assochub")
    logger.info("starting_assochub", env=settings.ENV, version=settings.VERSION)
    yield
    logger.info("shutting_down_assochub")


def create_app() -> FastAPI:
    """Application factory."""

    app = FastAPI(
        title="AssocHub API",
        description="AI-Powered Association Management System — multi-tenant, composable, AI-native.",
        version=settings.VERSION,
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Health", "description": "Service health and readiness probes"},
            {"name": "Authentication", "description": "JWT auth, registration, login, password management"},
            {"name": "Members", "description": "Member profiles, groups, tags, notes, bulk operations"},
            {"name": "Finances", "description": "Invoices, payments, expenses, budgets, dues structures"},
            {"name": "Events", "description": "Event management, registrations, speakers, sessions, feedback"},
            {"name": "Communications", "description": "Email campaigns, announcements, surveys, notifications"},
            {"name": "Elections", "description": "Elections, nominations, ranked-choice voting, results"},
            {"name": "Documents", "description": "Document management, versioning, sharing, categories"},
            {"name": "Analytics", "description": "Dashboards, KPIs, reports, AI insights, data exports"},
            {"name": "Workflows", "description": "Automation workflows, triggers, step execution engine"},
            {"name": "AI", "description": "AI chat, semantic search, predictions, document generation"},
            {"name": "Integrations", "description": "Third-party integrations, webhooks, event processing"},
        ],
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS — restrictive defaults for production
    allowed_origins = settings.CORS_ORIGINS
    if settings.ENV == "production" and "*" in allowed_origins:
        allowed_origins = [o for o in allowed_origins if o != "*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Tenant-ID", "X-Request-ID"],
    )

    # GZip compression
    app.add_middleware(GZipMiddleware, minimum_size=500)

    # Custom middleware (order matters — last added = first executed)
    app.add_middleware(AuditMiddleware)
    app.add_middleware(TenantMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Exception handlers
    register_exception_handlers(app)

    # Routers
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(members_router, prefix="/api/v1/members", tags=["Members"])
    app.include_router(finances_router, prefix="/api/v1/finances", tags=["Finances"])
    app.include_router(events_router, prefix="/api/v1/events", tags=["Events"])
    app.include_router(communications_router, prefix="/api/v1/communications", tags=["Communications"])
    app.include_router(elections_router, prefix="/api/v1/elections", tags=["Elections"])
    app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documents"])
    app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
    app.include_router(workflows_router, prefix="/api/v1/workflows", tags=["Workflows"])
    app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])
    app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["Integrations"])

    return app


app = create_app()
