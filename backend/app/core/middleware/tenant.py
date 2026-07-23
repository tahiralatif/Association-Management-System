"""Tenant middleware — extracts tenant context from requests."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Extracts tenant_id from request and sets it on the request state.
    
    Tenant resolution order:
    1. X-Tenant-ID header (for API consumers)
    2. Subdomain (app.assochub.com → app)
    3. JWT claim (for authenticated users)
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        tenant_id = None

        # 1. Check header
        tenant_id = request.headers.get("X-Tenant-ID")

        # 2. Check subdomain
        if not tenant_id:
            host = request.headers.get("host", "")
            parts = host.split(".")
            if len(parts) > 2:
                tenant_id = parts[0]

        # 3. Store on request state (JWT resolution happens in auth dependency)
        request.state.tenant_id = tenant_id

        response = await call_next(request)
        return response
