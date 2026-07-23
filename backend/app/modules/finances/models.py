"""Financial management models."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Float, ForeignKey, JSON, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.members.models import User, MemberProfile


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    STRIPE = "stripe"
    BANK_TRANSFER = "bank_transfer"
    CHECK = "check"
    CASH = "cash"
    OTHER = "other"


class ExpenseCategory(str, enum.Enum):
    OPERATIONS = "operations"
    EVENTS = "events"
    MARKETING = "marketing"
    TRAVEL = "travel"
    TECHNOLOGY = "technology"
    PROFESSIONAL_SERVICES = "professional_services"
    FACILITIES = "facilities"
    INSURANCE = "insurance"
    OTHER = "other"


class ExpenseStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"


class BudgetPeriod(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


# ── Dues Structure ───────────────────────────────────────────

class DuesStructure(Base):
    """Defines membership dues per tier."""
    __tablename__ = "dues_structures"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    tier: Mapped[str] = mapped_column(String(50))  # free, basic, premium, corporate, lifetime
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    billing_cycle: Mapped[str] = mapped_column(String(20), default="annual")  # annual, monthly, quarterly
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    prorate: Mapped[bool] = mapped_column(Boolean, default=True)
    trial_days: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    invoices: Mapped[list["Invoice"]] = relationship(back_populates="dues_structure")


# ── Invoice ──────────────────────────────────────────────────

class Invoice(Base):
    """Invoices for membership dues, events, etc."""
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True)

    # Related entities
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"), index=True)
    dues_structure_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("dues_structures.id"))
    event_id: Mapped[str | None] = mapped_column(String(36))  # nullable FK to events

    # Status
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT)

    # Amounts
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2))
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2))
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Line items
    line_items: Mapped[list | None] = mapped_column(JSON, default=[])
    # [{description: "Annual membership", quantity: 1, unit_price: 299}]

    # Dates
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Notes
    notes: Mapped[str | None] = mapped_column(Text)
    internal_notes: Mapped[str | None] = mapped_column(Text)

    # Stripe
    stripe_invoice_id: Mapped[str | None] = mapped_column(String(100))
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    dues_structure: Mapped["DuesStructure | None"] = relationship(back_populates="invoices")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")
    member: Mapped["MemberProfile | None"] = relationship(foreign_keys=[member_id], primaryjoin="Invoice.member_id == MemberProfile.id", viewonly=True)


# ── Payment ──────────────────────────────────────────────────

class Payment(Base):
    """Payment records linked to invoices."""
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    invoice_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("invoices.id"), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))

    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.STRIPE)
    status: Mapped[str] = mapped_column(String(20), default="completed")  # pending, completed, failed, refunded

    # Stripe
    stripe_charge_id: Mapped[str | None] = mapped_column(String(100))
    stripe_receipt_url: Mapped[str | None] = mapped_column(String(500))

    # Metadata
    reference_number: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default={})

    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="payments")


# ── Expense ──────────────────────────────────────────────────

class Expense(Base):
    """Expense tracking with approval workflow."""
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    # Submitter
    submitted_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    approved_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))

    # Details
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory), default=ExpenseCategory.OTHER)
    status: Mapped[ExpenseStatus] = mapped_column(Enum(ExpenseStatus), default=ExpenseStatus.DRAFT)

    # Dates
    expense_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reimbursed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Receipt
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    receipt_filename: Mapped[str | None] = mapped_column(String(255))

    # Budget tracking
    budget_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("budgets.id"))
    cost_center: Mapped[str | None] = mapped_column(String(100))

    # Approval
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    submitter: Mapped["User | None"] = relationship(foreign_keys=[submitted_by], primaryjoin="Expense.submitted_by == User.id", viewonly=True)
    approver: Mapped["User | None"] = relationship(foreign_keys=[approved_by], primaryjoin="Expense.approved_by == User.id", viewonly=True)


# ── Budget ───────────────────────────────────────────────────

class Budget(Base):
    """Budgets for tracking planned vs actual spending."""
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)

    # Budget details
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory))
    period: Mapped[BudgetPeriod] = mapped_column(Enum(BudgetPeriod), default=BudgetPeriod.ANNUAL)
    planned_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    actual_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Period dates
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Alerts
    alert_threshold: Mapped[float] = mapped_column(Numeric(5, 2), default=80)  # % threshold for alert
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    expenses: Mapped[list["Expense"]] = relationship(back_populates=None)


# ── Recurring Transaction ────────────────────────────────────

class RecurringTransaction(Base):
    """Auto-generate invoices on a schedule."""
    __tablename__ = "recurring_transactions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    dues_structure_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("dues_structures.id"))

    # Schedule
    frequency: Mapped[str] = mapped_column(String(20))  # monthly, quarterly, annual
    next_invoice_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_invoice_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
