"""Financial schemas — Pydantic models."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Dues Structure ───────────────────────────────────────────

class DuesStructureBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    tier: str
    amount: float = Field(ge=0)
    currency: str = "USD"
    billing_cycle: str = "annual"
    description: str | None = None
    prorate: bool = True
    trial_days: int = 0


class DuesStructureCreate(DuesStructureBase):
    pass


class DuesStructureUpdate(BaseModel):
    name: str | None = None
    amount: float | None = Field(default=None, ge=0)
    billing_cycle: str | None = None
    description: str | None = None
    prorate: bool | None = None
    is_active: bool | None = None


class DuesStructureResponse(DuesStructureBase):
    id: str
    tenant_id: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Invoice ──────────────────────────────────────────────────

class InvoiceLineItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float = Field(ge=0)


class InvoiceCreate(BaseModel):
    member_id: str
    dues_structure_id: str | None = None
    line_items: list[InvoiceLineItem]
    tax_rate: float = 0
    discount_amount: float = 0
    notes: str | None = None
    due_days: int = 30


class InvoiceUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    due_at: datetime | None = None
    discount_amount: float | None = None


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    member_id: str
    member_name: str = ""
    status: str
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total: float
    amount_paid: float
    currency: str
    line_items: list[dict] = []
    issued_at: datetime
    due_at: datetime
    paid_at: datetime | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceListParams(BaseModel):
    status: str | None = None
    member_id: str | None = None
    search: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    per_page: int = 50


# ── Payment ──────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float = Field(gt=0)
    payment_method: str = "stripe"
    reference_number: str | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: str
    invoice_id: str
    member_id: str
    amount: float
    currency: str
    payment_method: str
    status: str
    reference_number: str | None = None
    notes: str | None = None
    paid_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Expense ──────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    amount: float = Field(gt=0)
    currency: str = "USD"
    category: str = "other"
    expense_date: datetime
    receipt_filename: str | None = None
    budget_id: str | None = None
    cost_center: str | None = None


class ExpenseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    amount: float | None = Field(default=None, gt=0)
    category: str | None = None
    status: str | None = None
    rejection_reason: str | None = None
    receipt_filename: str | None = None


class ExpenseResponse(BaseModel):
    id: str
    submitted_by: str
    submitter_name: str = ""
    approved_by: str | None = None
    title: str
    description: str | None = None
    amount: float
    currency: str
    category: str
    status: str
    expense_date: datetime
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    receipt_filename: str | None = None
    budget_id: str | None = None
    cost_center: str | None = None
    rejection_reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseApprove(BaseModel):
    approved: bool
    rejection_reason: str | None = None


# ── Budget ───────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str
    period: str = "annual"
    planned_amount: float = Field(gt=0)
    currency: str = "USD"
    start_date: datetime
    end_date: datetime
    alert_threshold: float = 80


class BudgetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    planned_amount: float | None = Field(default=None, gt=0)
    alert_threshold: float | None = None
    is_active: bool | None = None


class BudgetResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    category: str
    period: str
    planned_amount: float
    actual_amount: float
    currency: str
    start_date: datetime
    end_date: datetime
    alert_threshold: float
    is_active: bool
    utilization_pct: float = 0.0
    remaining: float = 0.0
    is_over_budget: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Financial Dashboard ──────────────────────────────────────

class FinancialSummary(BaseModel):
    total_revenue: float
    total_expenses: float
    net_income: float
    outstanding_invoices: float
    overdue_invoices: float
    revenue_by_tier: dict[str, float]
    expenses_by_category: dict[str, float]
    monthly_trend: list[dict]  # [{month: "2026-01", revenue: 5000, expenses: 3000}]
    budget_utilization: list[dict]  # [{name: "Operations", planned: 50000, actual: 35000, pct: 70}]
    recent_payments: int
    at_risk_revenue: float  # revenue from at-risk members


class RevenueForecast(BaseModel):
    current_month: float
    projected_annual: float
    growth_rate: float
    forecast_months: list[dict]  # [{month: "2026-08", predicted: 12000, confidence: 0.85}]
