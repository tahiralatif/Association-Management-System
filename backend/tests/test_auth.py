"""Tests for authentication — JWT tokens, password hashing, token validation.

These tests verify the core auth logic WITHOUT needing a database.
"""

from __future__ import annotations

import uuid

import pytest


# ── Password Hashing ──────────────────────────────────────────


def test_hash_password():
    """Password hashing produces a bcrypt hash."""
    from app.core.auth import hash_password, verify_password

    plain = "SecurePass123!"
    hashed = hash_password(plain)

    assert hashed != plain
    assert len(hashed) > 20
    assert verify_password(plain, hashed)


def test_verify_wrong_password():
    """Wrong password should fail verification."""
    from app.core.auth import hash_password, verify_password

    hashed = hash_password("correct-password")
    assert not verify_password("wrong-password", hashed)


def test_different_hashes_for_same_password():
    """Same password should produce different hashes (salt)."""
    from app.core.auth import hash_password

    h1 = hash_password("test123")
    h2 = hash_password("test123")
    # Salts are random, so hashes differ
    assert h1 != h2


# ── JWT Access Tokens ─────────────────────────────────────────


def test_create_and_decode_access_token():
    """Create access token and decode it back."""
    from app.core.auth import create_access_token, decode_token

    user_id = str(uuid.uuid4())
    tenant_id = "test-tenant"
    roles = ["member", "staff"]

    token = create_access_token(user_id, tenant_id, roles)
    decoded = decode_token(token)

    assert decoded.sub == user_id
    assert decoded.tenant_id == tenant_id
    assert "member" in decoded.roles
    assert "staff" in decoded.roles
    assert decoded.type == "access"


def test_access_token_expiry():
    """Access token should have an expiration."""
    from app.core.auth import create_access_token, decode_token

    token = create_access_token("user-1", "tenant-1", ["member"])
    decoded = decode_token(token)

    assert decoded.exp is not None
    assert decoded.exp > 0  # Unix timestamp
    assert decoded.type == "access"


# ── JWT Refresh Tokens ────────────────────────────────────────


def test_create_and_decode_refresh_token():
    """Create refresh token and decode it back."""
    from app.core.auth import create_refresh_token, decode_token

    user_id = str(uuid.uuid4())
    tenant_id = "test-tenant"

    token = create_refresh_token(user_id, tenant_id)
    decoded = decode_token(token)

    assert decoded.sub == user_id
    assert decoded.tenant_id == tenant_id
    assert decoded.type == "refresh"


def test_refresh_token_longer_expiry():
    """Refresh token should expire later than access token."""
    from app.core.auth import create_access_token, create_refresh_token, decode_token

    access = create_access_token("u", "t", ["member"])
    refresh = create_refresh_token("u", "t")

    access_decoded = decode_token(access)
    refresh_decoded = decode_token(refresh)

    # Refresh should expire later than access
    assert refresh_decoded.exp > access_decoded.exp


# ── Invalid Tokens ────────────────────────────────────────────


def test_decode_invalid_token_raises():
    """Decoding garbage should raise an error."""
    from app.core.auth import decode_token

    with pytest.raises(Exception):
        decode_token("not.a.valid.jwt")


def test_decode_empty_token_raises():
    """Decoding empty string should raise."""
    from app.core.auth import decode_token

    with pytest.raises(Exception):
        decode_token("")


def test_decode_tampered_token_raises():
    """Decoding a modified token should raise."""
    from app.core.auth import create_access_token, decode_token

    token = create_access_token("user-1", "tenant-1", ["member"])
    # Tamper with the token
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(Exception):
        decode_token(tampered)


# ── Schema Validation ─────────────────────────────────────────


def test_user_create_schema_valid():
    """Valid UserCreate schema should pass."""
    from app.modules.members.schemas import UserCreate

    user = UserCreate(
        email="test@example.com",
        password="SecurePass123!",
        first_name="Test",
        last_name="User",
        tenant_id="demo",
    )
    assert user.email == "test@example.com"
    assert user.roles == ["member"]  # default


def test_user_create_schema_invalid_email():
    """Invalid email should fail validation."""
    from app.modules.members.schemas import UserCreate
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        UserCreate(
            email="not-an-email",
            password="x",
            first_name="X",
            last_name="Y",
            tenant_id="t",
        )


def test_invoice_create_schema():
    """InvoiceCreate schema with defaults."""
    from app.modules.finances.schemas import InvoiceCreate

    inv = InvoiceCreate(
        member_id="abc",
        line_items=[{"description": "Dues", "quantity": 1, "unit_price": 299}],
    )
    assert inv.tax_rate == 0
    assert inv.due_days == 30


def test_financial_summary_schema():
    """FinancialSummary schema with all fields."""
    from app.modules.finances.schemas import FinancialSummary

    fs = FinancialSummary(
        total_revenue=50000,
        total_expenses=30000,
        net_income=20000,
        outstanding_invoices=5000,
        overdue_invoices=1000,
        revenue_by_tier={"premium": 30000, "basic": 20000},
        expenses_by_category={"operations": 20000, "events": 10000},
        monthly_trend=[],
        budget_utilization=[],
        recent_payments=12,
        at_risk_revenue=3000,
    )
    assert fs.net_income == 20000


# ── Model Definitions ─────────────────────────────────────────


def test_member_models_import():
    """All member models should import cleanly."""
    from app.modules.members.models import (
        User, MemberProfile, MemberGroup, MemberGroupMembership,
        MemberTag, MemberProfileTag, MemberNote, MemberActivityLog,
        MembershipTier, MemberStatus, GroupType, GroupMemberRole,
    )

    assert MembershipTier.PREMIUM.value == "premium"
    assert MemberStatus.ACTIVE.value == "active"
    assert GroupType.COMMITTEE.value == "committee"


def test_finance_models_import():
    """All finance models should import cleanly."""
    from app.modules.finances.models import (
        DuesStructure, Invoice, Payment, Expense, Budget,
        RecurringTransaction, InvoiceStatus, PaymentMethod,
        ExpenseCategory, ExpenseStatus, TransactionType, BudgetPeriod,
    )

    assert InvoiceStatus.PAID.value == "paid"
    assert ExpenseStatus.APPROVED.value == "approved"


# ── Invoice Calculation Logic ─────────────────────────────────


def test_invoice_subtotal_calculation():
    """Invoice line item math."""
    line_items = [
        {"description": "Annual membership", "quantity": 1, "unit_price": 299},
        {"description": "Event registration", "quantity": 2, "unit_price": 75},
    ]
    subtotal = sum(item["quantity"] * item["unit_price"] for item in line_items)
    assert subtotal == 449


def test_invoice_with_tax_and_discount():
    """Invoice total with tax and discount."""
    subtotal = 449
    tax_rate = 8.5
    tax_amount = subtotal * (tax_rate / 100)
    discount = 50
    total = subtotal + tax_amount - discount

    assert round(tax_amount, 2) == 38.17
    assert round(total, 2) == 437.17


# ── App Creation ──────────────────────────────────────────────


def test_fastapi_app_creation():
    """FastAPI app should create with correct title and version."""
    from app.main import create_app

    app = create_app()
    assert "AssocHub" in app.title
    assert app.version == "0.1.0"


def test_app_has_expected_routes():
    """App should have routes for all major modules."""
    from app.main import create_app

    app = create_app()
    schema = app.openapi()
    paths = list(schema.get("paths", {}).keys())

    expected_prefixes = [
        "/api/v1/members",
        "/api/v1/finances",
        "/api/v1/auth",
        "/api/v1/events",
    ]
    for prefix in expected_prefixes:
        found = any(p.startswith(prefix) for p in paths)
        assert found, f"Routes for {prefix} not found"
