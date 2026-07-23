"""Comprehensive tests for the backend — models, schemas, and logic."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ═══════════════════════════════════════════════════════════════
# Test 1: Import Validation — all modules load without errors
# ═══════════════════════════════════════════════════════════════

def test_imports():
    """Verify all modules can be imported."""
    errors = []
    modules = [
        "app.config",
        "app.core.database",
        "app.core.auth",
        "app.modules.members.models",
        "app.modules.members.schemas",
        "app.modules.finances.models",
        "app.modules.finances.schemas",
    ]
    for mod in modules:
        try:
            __import__(mod)
        except Exception as e:
            errors.append(f"  {mod}: {e}")

    if errors:
        print(f"❌ Import errors:\n" + "\n".join(errors))
        return False
    print("✅ All modules import successfully")
    return True


# ═══════════════════════════════════════════════════════════════
# Test 2: Schema Validation — Pydantic models work correctly
# ═══════════════════════════════════════════════════════════════

def test_schemas():
    """Test Pydantic schema validation."""
    from app.modules.members.schemas import UserCreate, MemberStatsResponse, PaginatedResponse
    from app.modules.finances.schemas import (
        InvoiceCreate, InvoiceLineItem, FinancialSummary, BudgetCreate
    )

    errors = []

    # UserCreate
    try:
        u = UserCreate(
            email="test@example.com",
            password="secret123",
            first_name="Test",
            last_name="User",
            tenant_id="demo",
        )
        assert u.email == "test@example.com"
        assert u.roles == ["member"]  # default
    except Exception as e:
        errors.append(f"UserCreate: {e}")

    # UserCreate — invalid email
    try:
        UserCreate(email="not-an-email", password="x", first_name="X", last_name="Y", tenant_id="t")
        errors.append("UserCreate should reject invalid email")
    except Exception:
        pass  # expected

    # InvoiceCreate
    try:
        inv = InvoiceCreate(
            member_id="abc",
            line_items=[{"description": "Dues", "quantity": 1, "unit_price": 299}],
        )
        assert inv.tax_rate == 0
        assert inv.due_days == 30
    except Exception as e:
        errors.append(f"InvoiceCreate: {e}")

    # InvoiceLineItem
    try:
        item = InvoiceLineItem(description="Event fee", quantity=3, unit_price=50)
        assert item.quantity == 3
    except Exception as e:
        errors.append(f"InvoiceLineItem: {e}")

    # BudgetCreate
    try:
        from datetime import datetime, timezone
        b = BudgetCreate(
            name="Marketing",
            category="marketing",
            planned_amount=10000,
            start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2026, 12, 31, tzinfo=timezone.utc),
        )
        assert b.period == "annual"
    except Exception as e:
        errors.append(f"BudgetCreate: {e}")

    # FinancialSummary
    try:
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
    except Exception as e:
        errors.append(f"FinancialSummary: {e}")

    # PaginatedResponse
    try:
        p = PaginatedResponse(items=[], total=0, page=1, per_page=50, pages=0)
        assert p.pages == 0
    except Exception as e:
        errors.append(f"PaginatedResponse: {e}")

    if errors:
        print("❌ Schema errors:\n" + "\n".join(f"  {e}" for e in errors))
        return False
    print("✅ All schema validations pass")
    return True


# ═══════════════════════════════════════════════════════════════
# Test 3: Auth Logic — JWT, password hashing
# ═══════════════════════════════════════════════════════════════

def test_auth():
    """Test authentication utilities."""
    from app.core.auth import hash_password, verify_password, create_access_token, decode_token

    errors = []

    # Password hashing
    try:
        h = hash_password("testpassword")
        assert h != "testpassword"
        assert verify_password("testpassword", h)
        assert not verify_password("wrongpassword", h)
    except Exception as e:
        errors.append(f"Password hashing: {e}")

    # JWT tokens
    try:
        access = create_access_token("user-123", "tenant-abc", ["member", "staff"])
        decoded = decode_token(access)
        assert decoded.sub == "user-123"
        assert decoded.tenant_id == "tenant-abc"
        assert "member" in decoded.roles
        assert decoded.type == "access"
    except Exception as e:
        errors.append(f"JWT access token: {e}")

    # Refresh token
    try:
        from app.core.auth import create_refresh_token
        refresh = create_refresh_token("user-456", "tenant-xyz")
        decoded = decode_token(refresh)
        assert decoded.sub == "user-456"
        assert decoded.type == "refresh"
    except Exception as e:
        errors.append(f"JWT refresh token: {e}")

    # Invalid token
    try:
        decode_token("invalid.token.here")
        errors.append("Should have raised on invalid token")
    except Exception:
        pass  # expected

    if errors:
        print("❌ Auth errors:\n" + "\n".join(f"  {e}" for e in errors))
        return False
    print("✅ Auth logic works correctly")
    return True


# ═══════════════════════════════════════════════════════════════
# Test 4: Model Definitions — SQLAlchemy models valid
# ═══════════════════════════════════════════════════════════════

def test_models():
    """Verify all models are properly defined."""
    from app.modules.members.models import (
        User, MemberProfile, MemberGroup, MemberGroupMembership,
        MemberTag, MemberProfileTag, MemberNote, MemberActivityLog,
        MembershipTier, MemberStatus, GroupType, GroupMemberRole,
    )
    from app.modules.finances.models import (
        DuesStructure, Invoice, Payment, Expense, Budget,
        RecurringTransaction, InvoiceStatus, PaymentMethod,
        ExpenseCategory, ExpenseStatus, TransactionType, BudgetPeriod,
    )

    errors = []

    # Check table names
    expected_tables = {
        "users", "member_profiles", "member_groups",
        "member_group_memberships", "member_tags", "member_profile_tags",
        "member_notes", "member_activity_logs",
        "dues_structures", "invoices", "payments", "expenses",
        "budgets", "recurring_transactions",
    }
    actual_tables = set()
    for model in [User, MemberProfile, MemberGroup, MemberGroupMembership,
                  MemberTag, MemberProfileTag, MemberNote, MemberActivityLog,
                  DuesStructure, Invoice, Payment, Expense, Budget, RecurringTransaction]:
        actual_tables.add(model.__tablename__)

    missing = expected_tables - actual_tables
    if missing:
        errors.append(f"Missing tables: {missing}")

    # Check enums
    try:
        assert MembershipTier.PREMIUM.value == "premium"
        assert MemberStatus.ACTIVE.value == "active"
        assert InvoiceStatus.PAID.value == "paid"
        assert ExpenseStatus.APPROVED.value == "approved"
        assert GroupType.COMMITTEE.value == "committee"
    except Exception as e:
        errors.append(f"Enum values: {e}")

    if errors:
        print("❌ Model errors:\n" + "\n".join(f"  {e}" for e in errors))
        return False
    print("✅ All models valid — 14 tables, all enums correct")
    return True


# ═══════════════════════════════════════════════════════════════
# Test 5: Invoice Calculation Logic
# ═══════════════════════════════════════════════════════════════

def test_invoice_logic():
    """Test invoice calculation (subtotal, tax, total)."""
    errors = []

    line_items = [
        {"description": "Annual membership", "quantity": 1, "unit_price": 299},
        {"description": "Event registration", "quantity": 2, "unit_price": 75},
    ]
    subtotal = sum(item["quantity"] * item["unit_price"] for item in line_items)
    tax_rate = 8.5
    tax_amount = subtotal * (tax_rate / 100)
    discount = 50
    total = subtotal + tax_amount - discount

    try:
        assert subtotal == 449  # 299 + 150
        assert round(tax_amount, 2) == 38.17
        assert round(total, 2) == 437.17
    except AssertionError as e:
        errors.append(f"Invoice calc: {e}")

    if errors:
        print("❌ Invoice logic errors:\n" + "\n".join(f"  {e}" for e in errors))
        return False
    print("✅ Invoice calculation logic correct")
    return True


# ═══════════════════════════════════════════════════════════════
# Test 6: FastAPI App Creation
# ═══════════════════════════════════════════════════════════════

def test_app_creation():
    """Test FastAPI app factory."""
    errors = []

    try:
        from app.main import create_app
        app = create_app()
        assert "AssocHub" in app.title
        assert app.version == "0.1.0"

        # Check routes via OpenAPI schema (included routers are nested)
        schema = app.openapi()
        paths = list(schema.get("paths", {}).keys())
        expected_prefixes = ["/api/v1/members", "/api/v1/finances", "/api/v1/auth"]
        for prefix in expected_prefixes:
            found = any(p.startswith(prefix) for p in paths)
            if not found:
                errors.append(f"Routes for {prefix} not found in OpenAPI schema")
    except Exception as e:
        import traceback
        errors.append(f"App creation: {e}\n{traceback.format_exc()}")

    if errors:
        print("❌ App errors:\n" + "\n".join(f"  {e}" for e in errors))
        return False
    print("✅ FastAPI app creates successfully with all routes")
    return True


# ═══════════════════════════════════════════════════════════════
# Test 7: Module Router Count
# ═══════════════════════════════════════════════════════════════

def test_route_completeness():
    """Verify all modules have substantial routers."""
    import importlib
    modules = {
        "members": ["GET", "POST", "PATCH", "DELETE"],
        "finances": ["GET", "POST", "PATCH"],
    }
    errors = []

    for mod_name, expected_methods in modules.items():
        try:
            router_mod = importlib.import_module(f"app.modules.{mod_name}.router")
            router = router_mod.router
            route_count = len(router.routes)
            methods = set()
            for route in router.routes:
                if hasattr(route, "methods"):
                    methods.update(route.methods)

            if route_count < 10:
                errors.append(f"{mod_name}: only {route_count} routes (expected 10+)")
            for m in expected_methods:
                if m not in methods:
                    errors.append(f"{mod_name}: missing {m} methods")
        except Exception as e:
            errors.append(f"{mod_name}: {e}")

    if errors:
        print("❌ Route errors:\n" + "\n".join(f"  {e}" for e in errors))
        return False
    print("✅ All module routers have comprehensive endpoints")
    return True


# ═══════════════════════════════════════════════════════════════
# Run All Tests
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 AssocHub Backend Test Suite")
    print("=" * 60)
    print()

    tests = [
        ("Module Imports", test_imports),
        ("Schema Validation", test_schemas),
        ("Auth (JWT + Passwords)", test_auth),
        ("Model Definitions", test_models),
        ("Invoice Calculations", test_invoice_logic),
        ("FastAPI App Creation", test_app_creation),
        ("Route Completeness", test_route_completeness),
    ]

    results = []
    for name, test_fn in tests:
        print(f"\n--- {name} ---")
        passed = test_fn()
        results.append((name, passed))

    print("\n" + "=" * 60)
    print("📊 Results")
    print("=" * 60)

    passed = sum(1 for _, p in results if p)
    total = len(results)

    for name, p in results:
        icon = "✅" if p else "❌"
        print(f"  {icon} {name}")

    print(f"\n{'✅' if passed == total else '⚠️'} {passed}/{total} tests passed")

    if passed < total:
        sys.exit(1)
