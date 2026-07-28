"""Tests for member-related logic — schemas, model validation, permissions.

These tests verify member logic WITHOUT needing a database.
Integration tests (API endpoints) are separate.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


# ── Schema Validation ─────────────────────────────────────────


def test_user_create_valid():
    """Valid UserCreate schema."""
    from app.modules.members.schemas import UserCreate

    user = UserCreate(
        email="member@test.com",
        password="SecurePass123!",
        first_name="Jane",
        last_name="Doe",
        tenant_id="test-tenant",
    )
    assert user.email == "member@test.com"
    assert user.first_name == "Jane"
    assert user.roles == ["member"]


def test_user_create_default_roles():
    """UserCreate should default to ['member'] role."""
    from app.modules.members.schemas import UserCreate

    user = UserCreate(
        email="test@test.com",
        password="pass123!",
        first_name="A",
        last_name="B",
        tenant_id="t",
    )
    assert user.roles == ["member"]


def test_member_stats_response():
    """MemberStatsResponse should accept valid data."""
    from app.modules.members.schemas import MemberStatsResponse

    stats = MemberStatsResponse(
        total=100,
        active=85,
        pending=5,
        lapsed=3,
        cancelled=2,
        suspended=5,
        by_tier={"basic": 50, "premium": 35},
        by_group={"board": 5, "committee": 15},
        recent_joins=5,
        avg_engagement=72.5,
        at_risk_count=10,
    )
    assert stats.total == 100
    assert stats.active == 85


def test_paginated_response():
    """PaginatedResponse with items."""
    from app.modules.members.schemas import PaginatedResponse

    p = PaginatedResponse(items=[], total=0, page=1, per_page=50, pages=0)
    assert p.pages == 0
    assert p.total == 0


def test_paginated_response_calculates_pages():
    """PaginatedResponse should handle page math."""
    from app.modules.members.schemas import PaginatedResponse

    p = PaginatedResponse(items=[], total=100, page=1, per_page=10, pages=10)
    assert p.pages == 10


# ── Model Enums ───────────────────────────────────────────────


def test_member_status_enum():
    """MemberStatus enum values."""
    from app.modules.members.models import MemberStatus

    assert MemberStatus.ACTIVE.value == "active"
    assert MemberStatus.LAPSED.value == "lapsed"
    assert MemberStatus.PENDING.value == "pending"
    assert MemberStatus.SUSPENDED.value == "suspended"
    assert MemberStatus.CANCELLED.value == "cancelled"


def test_membership_tier_enum():
    """MembershipTier enum values."""
    from app.modules.members.models import MembershipTier

    assert MembershipTier.BASIC.value == "basic"
    assert MembershipTier.PREMIUM.value == "premium"
    assert MembershipTier.FREE.value == "free"
    assert MembershipTier.CORPORATE.value == "corporate"
    assert MembershipTier.LIFETIME.value == "lifetime"


def test_group_type_enum():
    """GroupType enum values."""
    from app.modules.members.models import GroupType

    assert GroupType.CHAPTER.value == "chapter"
    assert GroupType.COMMITTEE.value == "committee"
    assert GroupType.BOARD.value == "board"


def test_group_member_role_enum():
    """GroupMemberRole enum values."""
    from app.modules.members.models import GroupMemberRole

    assert GroupMemberRole.MEMBER.value == "member"
    assert GroupMemberRole.CHAIR.value == "chair"
    assert GroupMemberRole.CO_CHAIR.value == "co_chair"
    assert GroupMemberRole.SECRETARY.value == "secretary"
    assert GroupMemberRole.TREASURER.value == "treasurer"


# ── Model Table Names ─────────────────────────────────────────


def test_member_model_tablenames():
    """All member models should have correct table names."""
    from app.modules.members.models import (
        User, MemberProfile, MemberGroup, MemberGroupMembership,
        MemberTag, MemberProfileTag, MemberNote, MemberActivityLog,
    )

    assert User.__tablename__ == "users"
    assert MemberProfile.__tablename__ == "member_profiles"
    assert MemberGroup.__tablename__ == "member_groups"
    assert MemberGroupMembership.__tablename__ == "member_group_memberships"
    assert MemberTag.__tablename__ == "member_tags"
    assert MemberProfileTag.__tablename__ == "member_profile_tags"
    assert MemberNote.__tablename__ == "member_notes"
    assert MemberActivityLog.__tablename__ == "member_activity_logs"


# ── Permission Logic ──────────────────────────────────────────


def test_admin_has_wildcard_permission():
    """Super admin role should have wildcard permission."""
    from app.core.auth.permissions import ROLE_PERMISSIONS

    admin_perms = ROLE_PERMISSIONS.get("super_admin", [])
    assert "*" in admin_perms  # Wildcard = everything


def test_member_has_limited_permissions():
    """Member role should have fewer permissions."""
    from app.core.auth.permissions import ROLE_PERMISSIONS

    member_perms = ROLE_PERMISSIONS.get("member", [])
    assert "members:read" in member_perms
    assert "members:delete" not in member_perms


def test_user_has_permission_function():
    """user_has_permission function should work correctly."""
    from app.core.auth.permissions import user_has_permission

    # Admin with super_admin role (has wildcard)
    assert user_has_permission(["super_admin"], None, "members:read")
    assert user_has_permission(["super_admin"], None, "finances:read")

    # Member with limited perms
    assert user_has_permission(["member"], None, "members:read")
    assert not user_has_permission(["member"], None, "members:delete")

    # Custom permissions add to role
    assert user_has_permission(["member"], ["members:delete"], "members:delete")


# ── API Endpoint Existence ────────────────────────────────────


@pytest.mark.asyncio
async def test_members_router_has_endpoints(client: AsyncClient):
    """Members router should have key endpoints."""
    resp = await client.get("/api/v1/members/me", headers={"Authorization": "Bearer fake"})
    # Should get 401 (auth required) not 404 (route not found)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_members_stats_endpoint_exists(client: AsyncClient):
    """Stats endpoint should exist."""
    resp = await client.get(
        "/api/v1/members/stats",
        headers={"Authorization": "Bearer fake"},
    )
    # 401 = auth required (good), 404 = route missing (bad)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_members_list_requires_auth(client: AsyncClient):
    """Listing members should require authentication."""
    resp = await client.get("/api/v1/members/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_members_bulk_delete_requires_auth(client: AsyncClient):
    """Bulk delete should require authentication."""
    resp = await client.post(
        "/api/v1/members/bulk/delete",
        json={"member_ids": []},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_members_export_requires_auth(client: AsyncClient):
    """CSV export should require authentication."""
    resp = await client.get("/api/v1/members/export/csv")
    assert resp.status_code == 401
