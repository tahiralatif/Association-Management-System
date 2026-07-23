"""Audit logging middleware — tracks all requests."""

import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

try:
    import structlog
    logger = structlog.get_logger("audit")
except ImportError:
    logger = logging.getLogger("audit")


class AuditMiddleware(BaseHTTPMiddleware):
    """Logs all HTTP requests with timing and tenant context."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000
        tenant_id = getattr(request.state, "tenant_id", None)
        user_id = getattr(request.state, "user_id", None)

        log_method = getattr(logger, "info", logger.info) if hasattr(logger, "info") else logger.info
        log_method(
            "http_request method=%s path=%s status=%d duration=%.2fms tenant=%s user=%s client=%s",
            request.method,
            request.url.path,
            response.status_code,
            round(duration_ms, 2),
            tenant_id,
            user_id,
            request.client.host if request.client else None,
        )

        return response
