"""Shared test fixtures for AssocHub backend tests.

Provides async HTTP client and auth helpers.
Uses dependency overrides to avoid database connection issues in tests.
"""

from __future__ import annotations

import os
import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


# ── Mock Database Session ─────────────────────────────────────

def _create_mock_db():
    """Create a mock database session that returns empty results."""
    mock = AsyncMock()
    mock.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))))
    mock.commit = AsyncMock()
    mock.rollback = AsyncMock()
    mock.flush = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    return mock


# ── HTTP Client ───────────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client bound to the FastAPI app.

    Uses mock database to avoid connection issues.
    """
    from app.main import create_app
    from app.core.database import get_db

    app = create_app()

    # Override database dependency with mock
    async def _override_get_db():
        db = _create_mock_db()
        yield db

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Auth Helpers ──────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_token(client: AsyncClient) -> str:
    """Create an admin-level access token."""
    from app.core.auth import create_access_token

    token = create_access_token(
        user_id=str(uuid.uuid4()),
        tenant_id="test-tenant",
        roles=["super_admin"],
    )
    return token


@pytest_asyncio.fixture
async def member_token(client: AsyncClient) -> str:
    """Create a member-level access token."""
    from app.core.auth import create_access_token

    token = create_access_token(
        user_id=str(uuid.uuid4()),
        tenant_id="test-tenant",
        roles=["member"],
    )
    return token


@pytest_asyncio.fixture
def auth_headers(admin_token: str) -> dict:
    """Authorization headers for admin requests."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
def member_headers(member_token: str) -> dict:
    """Authorization headers for member requests."""
    return {"Authorization": f"Bearer {member_token}"}
