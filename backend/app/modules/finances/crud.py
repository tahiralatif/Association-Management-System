"""Financial CRUD — database operations."""

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.finances.models import (
    Budget,
    DuesStructure,
    Expense,
    ExpenseStatus,
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    RecurringTransaction,
)
from app.modules.members.models import MemberProfile, MembershipTier, User


# ── Dues Structures ──────────────────────────────────────────

async def list_dues_structures(db: AsyncSession, tenant_id: str, active_only: bool = True) -> list[DuesStructure]:
    query = select(DuesStructure).where(DuesStructure.tenant_id == tenant_id)
    if active_only:
        query = query.where(DuesStructure.is_active == True)
    query = query.order_by(DuesStructure.amount)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_dues_structure(db: AsyncSession, ds_id: str, tenant_id: str) -> DuesStructure | None:
    result = await db.execute(
        select(DuesStructure).where(DuesStructure.id == ds_id, DuesStructure.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def create_dues_structure(db: AsyncSession, tenant_id: str, data: dict) -> DuesStructure:
    ds = DuesStructure(tenant_id=tenant_id, **data)
    db.add(ds)
    await db.flush()
    return ds


async def update_dues_structure(db: AsyncSession, ds_id: str, tenant_id: str, updates: dict) -> DuesStructure | None:
    ds = await get_dues_structure(db, ds_id, tenant_id)
    if not ds:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(ds, key):
            setattr(ds, key, value)
    await db.flush()
    return ds


# ── Invoices ─────────────────────────────────────────────────

async def generate_invoice_number(db: AsyncSession, tenant_id: str) -> str:
    """Generate next sequential invoice number."""
    result = await db.execute(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.tenant_id == tenant_id)
    )
    count = (result.scalar() or 0) + 1
    return f"INV-{datetime.now(timezone.utc).year}-{count:05d}"


async def create_invoice(db: AsyncSession, tenant_id: str, data: dict, due_days: int = 30) -> Invoice:
    """Create an invoice from line items."""
    line_items = data.get("line_items", [])
    subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in line_items)
    tax_rate = data.get("tax_rate", 0)
    tax_amount = subtotal * (tax_rate / 100)
    discount = data.get("discount_amount", 0)
    total = subtotal + tax_amount - discount

    invoice = Invoice(
        tenant_id=tenant_id,
        invoice_number=await generate_invoice_number(db, tenant_id),
        member_id=data["member_id"],
        dues_structure_id=data.get("dues_structure_id"),
        status=InvoiceStatus.PENDING,
        subtotal=round(subtotal, 2),
        tax_rate=tax_rate,
        tax_amount=round(tax_amount, 2),
        discount_amount=round(discount, 2),
        total=round(total, 2),
        line_items=line_items,
        due_at=datetime.now(timezone.utc) + timedelta(days=due_days),
        notes=data.get("notes"),
    )
    db.add(invoice)
    await db.flush()
    return invoice


async def list_invoices(
    db: AsyncSession,
    tenant_id: str,
    status: str | None = None,
    member_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[dict], int]:
    """List invoices with filters."""
    query = (
        select(Invoice)
        .options(selectinload(Invoice.member).selectinload(MemberProfile.user))
        .where(Invoice.tenant_id == tenant_id)
    )

    if status:
        query = query.where(Invoice.status == status)
    if member_id:
        query = query.where(Invoice.member_id == member_id)
    if date_from:
        query = query.where(Invoice.issued_at >= date_from)
    if date_to:
        query = query.where(Invoice.issued_at <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Invoice.issued_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    invoices = list(result.scalars().unique().all())

    enriched = []
    for inv in invoices:
        member_name = ""
        if inv.member and inv.member.user:
            member_name = f"{inv.member.user.first_name} {inv.member.user.last_name}"
        enriched.append({
            **{c.key: getattr(inv, c.key) for c in Invoice.__table__.columns},
            "member_name": member_name,
        })

    return enriched, total


async def get_invoice(db: AsyncSession, invoice_id: str, tenant_id: str) -> Invoice | None:
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.payments),
            selectinload(Invoice.member).selectinload(MemberProfile.user),
        )
        .where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_invoice_status(db: AsyncSession, invoice_id: str, tenant_id: str, status: str) -> Invoice | None:
    invoice = await get_invoice(db, invoice_id, tenant_id)
    if not invoice:
        return None
    invoice.status = InvoiceStatus(status)
    if status == "paid":
        invoice.paid_at = datetime.now(timezone.utc)
    elif status == "cancelled":
        invoice.cancelled_at = datetime.now(timezone.utc)
    await db.flush()
    return invoice


async def auto_mark_overdue(db: AsyncSession, tenant_id: str) -> int:
    """Mark invoices as overdue if past due date and send reminders."""
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.member).selectinload(MemberProfile.user),
        )
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.status == InvoiceStatus.PENDING,
            Invoice.due_at < datetime.now(timezone.utc),
        )
    )
    overdue = result.scalars().unique().all()
    for inv in overdue:
        inv.status = InvoiceStatus.OVERDUE
        # Send overdue notification
        try:
            from app.core.notifications import notify_invoice_overdue
            if inv.member and inv.member.user:
                u = inv.member.user
                days = (datetime.now(timezone.utc) - inv.due_at).days
                notify_invoice_overdue(
                    inv.invoice_number, float(inv.total),
                    u.email, f"{u.first_name} {u.last_name}", days,
                )
        except Exception:
            pass
    await db.flush()
    return len(overdue)


# ── Payments ─────────────────────────────────────────────────

async def record_payment(db: AsyncSession, tenant_id: str, data: dict) -> Payment:
    """Record a payment against an invoice."""
    invoice = await get_invoice(db, data["invoice_id"], tenant_id)
    if not invoice:
        raise ValueError("Invoice not found")

    amount = data["amount"]
    if amount <= 0:
        raise ValueError("Payment amount must be greater than 0")

    remaining = float(invoice.total) - float(invoice.amount_paid or 0)
    if amount > remaining + 0.01:  # small tolerance for float
        raise ValueError(f"Payment amount {amount} exceeds remaining balance {remaining:.2f}")

    payment = Payment(
        tenant_id=tenant_id,
        invoice_id=data["invoice_id"],
        member_id=invoice.member_id,
        amount=data["amount"],
        currency=invoice.currency,
        payment_method=PaymentMethod(data.get("payment_method", "stripe")),
        status="completed",
        reference_number=data.get("reference_number"),
        notes=data.get("notes"),
    )
    db.add(payment)

    # Update invoice
    invoice.amount_paid = float(invoice.amount_paid) + data["amount"]
    if invoice.amount_paid >= invoice.total:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = datetime.now(timezone.utc)

    await db.flush()
    return payment


async def list_payments(
    db: AsyncSession, tenant_id: str, invoice_id: str | None = None, page: int = 1, per_page: int = 50
) -> tuple[list[Payment], int]:
    query = select(Payment).where(Payment.tenant_id == tenant_id)
    if invoice_id:
        query = query.where(Payment.invoice_id == invoice_id)

    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Payment.paid_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


# ── Expenses ─────────────────────────────────────────────────

async def create_expense(db: AsyncSession, tenant_id: str, submitter_id: str, data: dict) -> Expense:
    expense = Expense(
        tenant_id=tenant_id,
        submitted_by=submitter_id,
        **data,
        status=ExpenseStatus.DRAFT,
    )
    db.add(expense)
    await db.flush()
    return expense


async def list_expenses(
    db: AsyncSession,
    tenant_id: str,
    status: str | None = None,
    category: str | None = None,
    submitted_by: str | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[dict], int]:
    query = (
        select(Expense)
        .options(selectinload(Expense.submitter))
        .where(Expense.tenant_id == tenant_id)
    )

    if status:
        query = query.where(Expense.status == status)
    if category:
        query = query.where(Expense.category == category)
    if submitted_by:
        query = query.where(Expense.submitted_by == submitted_by)

    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Expense.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    expenses = list(result.scalars().unique().all())

    enriched = []
    for exp in expenses:
        submitter_name = ""
        if exp.submitter:
            submitter_name = f"{exp.submitter.first_name} {exp.submitter.last_name}"
        enriched.append({
            **{c.key: getattr(exp, c.key) for c in Expense.__table__.columns},
            "submitter_name": submitter_name,
        })

    return enriched, count


async def approve_expense(
    db: AsyncSession, expense_id: str, tenant_id: str, approved_by: str, approved: bool, reason: str | None = None
) -> Expense | None:
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.tenant_id == tenant_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        return None

    if approved:
        expense.status = ExpenseStatus.APPROVED
        expense.approved_by = approved_by
        expense.approved_at = datetime.now(timezone.utc)
    else:
        expense.status = ExpenseStatus.REJECTED
        expense.rejection_reason = reason

    await db.flush()
    return expense


# ── Budgets ──────────────────────────────────────────────────

async def create_budget(db: AsyncSession, tenant_id: str, data: dict) -> Budget:
    budget = Budget(tenant_id=tenant_id, **data)
    db.add(budget)
    await db.flush()
    return budget


async def list_budgets(db: AsyncSession, tenant_id: str) -> list[dict]:
    result = await db.execute(
        select(Budget).where(Budget.tenant_id == tenant_id).order_by(Budget.name)
    )
    budgets = list(result.scalars().all())

    enriched = []
    for b in budgets:
        planned = float(b.planned_amount) or 0
        actual = float(b.actual_amount) or 0
        pct = (actual / planned * 100) if planned > 0 else 0
        enriched.append({
            **{c.key: getattr(b, c.key) for c in Budget.__table__.columns},
            "utilization_pct": round(pct, 1),
            "remaining": round(planned - actual, 2),
            "is_over_budget": actual > planned,
        })
    return enriched


async def get_budget(db: AsyncSession, budget_id: str, tenant_id: str) -> Budget | None:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


# ── Financial Summary ────────────────────────────────────────

async def get_financial_summary(db: AsyncSession, tenant_id: str) -> dict:
    """Comprehensive financial dashboard data."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total revenue (paid invoices this year)
    revenue = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.status == InvoiceStatus.PAID,
            Invoice.paid_at >= year_start,
        )
    )
    total_revenue = float(revenue.scalar())

    # Total expenses (approved this year)
    expenses = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            Expense.tenant_id == tenant_id,
            Expense.status == ExpenseStatus.APPROVED,
            Expense.expense_date >= year_start,
        )
    )
    total_expenses = float(expenses.scalar())

    # Outstanding invoices
    outstanding = await db.execute(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0))
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
        )
    )
    outstanding_amount = float(outstanding.scalar())

    # Overdue invoices
    overdue = await db.execute(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0))
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.status == InvoiceStatus.OVERDUE,
        )
    )
    overdue_amount = float(overdue.scalar())

    # Revenue by tier
    by_tier = await db.execute(
        select(MemberProfile.tier, func.coalesce(func.sum(Invoice.total), 0))
        .join(Invoice, MemberProfile.id == Invoice.member_id)
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.status == InvoiceStatus.PAID,
            Invoice.paid_at >= year_start,
        )
        .group_by(MemberProfile.tier)
    )
    revenue_by_tier = {str(t): float(v) for t, v in by_tier.all()}

    # Expenses by category
    by_cat = await db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
        .where(
            Expense.tenant_id == tenant_id,
            Expense.status == ExpenseStatus.APPROVED,
            Expense.expense_date >= year_start,
        )
        .group_by(Expense.category)
    )
    expenses_by_category = {str(c): float(v) for c, v in by_cat.all()}

    # Recent payments count
    recent = await db.execute(
        select(func.count())
        .select_from(Payment)
        .where(Payment.tenant_id == tenant_id, Payment.paid_at >= month_start)
    )
    recent_payments = recent.scalar() or 0

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_income": total_revenue - total_expenses,
        "outstanding_invoices": outstanding_amount,
        "overdue_invoices": overdue_amount,
        "revenue_by_tier": revenue_by_tier,
        "expenses_by_category": expenses_by_category,
        "monthly_trend": [],  # Would compute with a date_trunc query
        "budget_utilization": await list_budgets(db, tenant_id),
        "recent_payments": recent_payments,
        "at_risk_revenue": 0,  # Would compute from at-risk member lifetime values
    }


# ── Recurring Invoices ───────────────────────────────────────

async def process_recurring_invoices(db: AsyncSession, tenant_id: str) -> int:
    """Generate invoices for recurring transactions due today."""
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(RecurringTransaction).where(
            RecurringTransaction.tenant_id == tenant_id,
            RecurringTransaction.is_active == True,
            func.date(RecurringTransaction.next_invoice_date) <= today,
        )
    )
    recurring = result.scalars().all()
    count = 0

    for rt in recurring:
        # Get dues structure
        ds = await get_dues_structure(db, rt.dues_structure_id, tenant_id)
        if not ds:
            continue

        # Create invoice
        await create_invoice(
            db, tenant_id,
            {
                "member_id": rt.member_id,
                "dues_structure_id": rt.dues_structure_id,
                "line_items": [{"description": ds.name, "quantity": 1, "unit_price": float(ds.amount)}],
            },
        )

        # Update next date
        if rt.frequency == "monthly":
            rt.next_invoice_date = rt.next_invoice_date + timedelta(days=30)
        elif rt.frequency == "quarterly":
            rt.next_invoice_date = rt.next_invoice_date + timedelta(days=90)
        elif rt.frequency == "annual":
            rt.next_invoice_date = rt.next_invoice_date + timedelta(days=365)

        rt.last_invoice_date = datetime.now(timezone.utc)
        count += 1

    await db.flush()
    return count
