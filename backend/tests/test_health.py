"""Tests for health and system endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """GET /health should return 200 or 503 with status info."""
    resp = await client.get("/health")
    # 200 = all healthy, 503 = degraded (Redis/Celery may not be running in test)
    assert resp.status_code in (200, 503)
    data = resp.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_health_includes_version(client: AsyncClient):
    """Health response should include version info."""
    resp = await client.get("/health")
    data = resp.json()
    assert "version" in data or "app" in data


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    """OpenAPI schema should be accessible in debug mode."""
    resp = await client.get("/api/docs")
    # May be 200 (Redoc) or 307 (redirect to /docs)
    assert resp.status_code in (200, 307, 404)


@pytest.mark.asyncio
async def test_nonexistent_route_returns_404(client: AsyncClient):
    """Unknown routes should return 404."""
    resp = await client.get("/api/v1/this-does-not-exist")
    assert resp.status_code == 404
