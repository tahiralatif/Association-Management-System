"""Financial routes — API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin, require_staff, TokenPayload
from app.core.database import get_db
from app.modules.finances import crud
from app.modules.finances.schemas import (
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
    DiscountApplyRequest,
    DiscountApplyResponse,
    DiscountCodeCreate,
    DiscountCodeResponse,
    DiscountCodeUpdate,
    DuesStructureCreate,
    DuesStructureResponse,
    DuesStructureUpdate,
    ExpenseApprove,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    FinancialSummary,
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
    PaymentCreate,
    PaymentResponse,
)
from app.core.auth import get_current_user, require_admin, require_member, require_staff, TokenPayload

router = APIRouter(prefix="/finances", tags=["finances"])


# ── Dues Structures ──────────────────────────────────────────

@router.get("/dues", response_model=list[DuesStructureResponse])
async def list_dues_structures(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    return await crud.list_dues_structures(db, user.tenant_id)


@router.post("/dues", response_model=DuesStructureResponse, status_code=status.HTTP_201_CREATED)
async def create_dues_structure(
    data: DuesStructureCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await crud.create_dues_structure(db, user.tenant_id, data.model_dump())


@router.patch("/dues/{ds_id}", response_model=DuesStructureResponse)
async def update_dues_structure(
    ds_id: str,
    data: DuesStructureUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ds = await crud.update_dues_structure(db, ds_id, user.tenant_id, data.model_dump(exclude_unset=True))
    if not ds:
        raise HTTPException(status_code=404, detail="Dues structure not found")
    return ds


# ── Invoices ─────────────────────────────────────────────────

@router.get("/invoices")
async def list_invoices(
    status_filter: str | None = Query(None, alias="status"),
    member_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    invoices, total = await crud.list_invoices(
        db, user.tenant_id, status=status_filter, member_id=member_id, page=page, per_page=per_page
    )
    return {
        "items": invoices,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/invoices/stats")
async def get_invoice_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice statistics."""
    from app.modules.finances.models import Invoice

    total_q = select(func.count()).select_from(Invoice).where(Invoice.tenant_id == user.tenant_id)
    total = (await db.execute(total_q)).scalar() or 0

    status_q = (
        select(Invoice.status, func.count())
        .where(Invoice.tenant_id == user.tenant_id)
        .group_by(Invoice.status)
    )
    rows = (await db.execute(status_q)).all()
    by_status = {r[0]: r[1] for r in rows}

    amount_q = (
        select(func.coalesce(func.sum(Invoice.total), 0), func.coalesce(func.sum(Invoice.amount_paid), 0))
        .where(Invoice.tenant_id == user.tenant_id)
    )
    amounts = (await db.execute(amount_q)).one()

    return {
        "total": total,
        "by_status": by_status,
        "total_amount": float(amounts[0]),
        "total_paid": float(amounts[1]),
        "outstanding": float(amounts[0]) - float(amounts[1]),
    }


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    member_name = ""
    if invoice.member and invoice.member.user:
        member_name = f"{invoice.member.user.first_name} {invoice.member.user.last_name}"
    return InvoiceResponse(
        **{c.key: getattr(invoice, c.key) for c in invoice.__table__.columns},
        member_name=member_name,
    )


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Accept both user_id and member_profile_id for member_id
    member_id = data.member_id
    if member_id:
        from app.modules.members.models import MemberProfile, User
        from sqlalchemy import select
        # Check if this is a user_id (no matching profile) and resolve
        result = await db.execute(select(MemberProfile).where(MemberProfile.id == member_id))
        profile = result.scalar_one_or_none()
        if not profile:
            # Try as user_id
            result2 = await db.execute(select(MemberProfile).where(MemberProfile.user_id == member_id))
            profile = result2.scalar_one_or_none()
            if profile:
                member_id = profile.id
        data_dict = data.model_dump()
        data_dict["member_id"] = member_id
    else:
        data_dict = data.model_dump()

    invoice = await crud.create_invoice(db, user.tenant_id, data_dict)
    from app.core.audit import log_financial_event
    await log_financial_event(db, user.tenant_id, user.sub, "create", "invoice", invoice.id,
                              {"member_id": member_id, "total": float(invoice.total)})

    # Send invoice email notification
    try:
        from app.core.notifications import notify_invoice_created
        from app.modules.members.models import MemberProfile as _MP, User as _U
        from sqlalchemy import select as _sel
        result = await db.execute(
            _sel(_MP).where(_MP.id == member_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            user_result = await db.execute(_sel(_U).where(_U.id == profile.user_id))
            db_user = user_result.scalar_one_or_none()
            if db_user:
                name = f"{db_user.first_name} {db_user.last_name}"
                notify_invoice_created(
                    invoice.invoice_number, float(invoice.total),
                    db_user.email, name, invoice.due_at.strftime("%B %d, %Y"),
                )
    except Exception:
        pass  # Don't fail invoice creation if email fails

    # Fire integration event
    from app.core.events import emit_finance_event
    await emit_finance_event(db, user.tenant_id, "create_invoice", {
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "total": float(invoice.total),
        "member_id": str(member_id) if member_id else None,
    })

    return InvoiceResponse(**{c.key: getattr(invoice, c.key) for c in invoice.__table__.columns})


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if data.status:
        invoice.status = InvoiceStatus(data.status)
        if data.status == "paid":
            invoice.paid_at = datetime.now(timezone.utc)
        elif data.status == "cancelled":
            invoice.cancelled_at = datetime.now(timezone.utc)
    if data.notes is not None:
        invoice.notes = data.notes
    if data.due_at is not None:
        invoice.due_at = data.due_at
    if data.discount_amount is not None:
        invoice.discount_amount = data.discount_amount
    await db.flush()
    return InvoiceResponse(**{c.key: getattr(invoice, c.key) for c in invoice.__table__.columns})


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Send invoice to member via email."""
    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Dispatch email (best-effort, non-blocking)
    try:
        import threading
        def _send():
            try:
                from app.tasks.email import send_email_task
                member_email = invoice.member.user.email if invoice.member and invoice.member.user else None
                if member_email:
                    send_email_task.delay(
                        to=member_email,
                        subject=f"Invoice {invoice.invoice_number}",
                        html_body=f"<p>Your invoice {invoice.invoice_number} for ${float(invoice.total):.2f} is ready.</p>",
                        tenant_id=user.tenant_id,
                    )
            except Exception:
                pass
        t = threading.Thread(target=_send, daemon=True)
        t.start()
    except Exception:
        pass

    from app.core.audit import log_financial_event
    await log_financial_event(db, user.tenant_id, user.sub, "send", "invoice", invoice_id)

    return {"message": "Invoice sent", "invoice_id": invoice_id}


# ── Invoice PDF Download ──────────────────────────────────────

@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download invoice as PDF."""
    from fastapi.responses import Response
    from app.core.pdf import generate_invoice_pdf

    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Build member info
    member_name = ""
    member_email = ""
    member_address = ""
    if invoice.member and invoice.member.user:
        member_name = f"{invoice.member.user.first_name} {invoice.member.user.last_name}"
        member_email = invoice.member.user.email

    # Build line items from invoice JSON field
    line_items = invoice.line_items or []
    if not line_items and invoice.subtotal:
        # Fallback: create a single line item from subtotal
        line_items = [{"description": "Membership Dues", "quantity": 1, "unit_price": float(invoice.subtotal), "amount": float(invoice.subtotal)}]

    # Build association info from tenant_id
    association_name = user.tenant_id.replace('-', ' ').title()
    association_email = ""
    association_address = ""

    pdf_data = generate_invoice_pdf({
        "association_name": association_name,
        "association_email": association_email,
        "association_address": association_address,
        "invoice_number": invoice.invoice_number,
        "status": invoice.status.value if invoice.status else "pending",
        "issued_at": invoice.issued_at.strftime("%B %d, %Y") if invoice.issued_at else "—",
        "due_at": invoice.due_at.strftime("%B %d, %Y") if invoice.due_at else "—",
        "member_name": member_name,
        "member_email": member_email,
        "member_address": member_address,
        "line_items": line_items,
        "subtotal": float(invoice.subtotal or 0),
        "tax_rate": float(invoice.tax_rate or 0),
        "tax_amount": float(invoice.tax_amount or 0),
        "discount_amount": float(invoice.discount_amount or 0),
        "total": float(invoice.total or 0),
        "amount_paid": float(invoice.amount_paid or 0),
        "balance_due": float(invoice.total or 0) - float(invoice.amount_paid or 0),
        "currency": invoice.currency or "USD",
        "currency_symbol": "$",
        "notes": invoice.notes or "",
        "payment_instructions": "Payment is due within 30 days of the invoice date. Pay online at https://ams.14.jugaar.ai/finances",
        "generated_at": datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC"),
    })

    from app.core.audit import log_financial_event
    await log_financial_event(db, user.tenant_id, user.sub, "download", "invoice_pdf", invoice_id)

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice-{invoice.invoice_number}.pdf"',
        },
    )


# ── Payments ─────────────────────────────────────────────────

@router.get("/payments")
async def list_payments(
    invoice_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    payments, total = await crud.list_payments(db, user.tenant_id, invoice_id=invoice_id, page=page, per_page=per_page)
    return {
        "items": [PaymentResponse.model_validate(p) for p in payments],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    data: PaymentCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        payment = await crud.record_payment(db, user.tenant_id, data.model_dump())
        from app.core.audit import log_financial_event
        await log_financial_event(db, user.tenant_id, user.sub, "record", "payment", payment.id,
                                  {"invoice_id": data.invoice_id, "amount": float(payment.amount)})

        # Send payment confirmation email
        try:
            from app.core.notifications import notify_invoice_paid
            from app.modules.members.models import MemberProfile, User
            from sqlalchemy import select
            invoice = await crud.get_invoice(db, data.invoice_id, user.tenant_id)
            if invoice and invoice.member and invoice.member.user:
                u = invoice.member.user
                name = f"{u.first_name} {u.last_name}"
                notify_invoice_paid(invoice.invoice_number, float(payment.amount), u.email, name)
        except Exception:
            pass

        return PaymentResponse.model_validate(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Expenses ─────────────────────────────────────────────────

@router.get("/expenses")
async def list_expenses(
    status_filter: str | None = Query(None, alias="status"),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    expenses, total = await crud.list_expenses(
        db, user.tenant_id, status=status_filter, category=category, page=page, per_page=per_page
    )
    return {
        "items": expenses,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    expense = await crud.create_expense(db, user.tenant_id, user.sub, data.model_dump())
    return ExpenseResponse(**{c.key: getattr(expense, c.key) for c in expense.__table__.columns})


@router.post("/expenses/{expense_id}/approve")
async def approve_expense(
    expense_id: str,
    data: ExpenseApprove,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    expense = await crud.approve_expense(
        db, expense_id, user.tenant_id, user.sub, data.approved, data.rejection_reason
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    from app.core.audit import log_financial_event
    await log_financial_event(db, user.tenant_id, user.sub,
                              "approve" if data.approved else "reject", "expense", expense_id,
                              {"approved": data.approved, "reason": data.rejection_reason})
    return {"message": "Expense approved" if data.approved else "Expense rejected"}


@router.post("/expenses/{expense_id}/submit")
async def submit_expense(
    expense_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Submit expense for approval."""
    from app.modules.finances.models import Expense, ExpenseStatus
    from sqlalchemy import select

    from datetime import datetime, timezone

    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.tenant_id == user.tenant_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.status != ExpenseStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft expenses can be submitted")

    expense.status = ExpenseStatus.PENDING_APPROVAL
    expense.submitted_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Expense submitted for approval"}


# ── Budgets ──────────────────────────────────────────────────

@router.get("/budgets", response_model=list[BudgetResponse])
async def list_budgets(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    budgets = await crud.list_budgets(db, user.tenant_id)
    return [BudgetResponse(**b) for b in budgets]


@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    budget = await crud.create_budget(db, user.tenant_id, data.model_dump())
    return BudgetResponse(**{c.key: getattr(budget, c.key) for c in budget.__table__.columns})


@router.patch("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    data: BudgetUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    budget = await crud.get_budget(db, budget_id, user.tenant_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if value is not None:
            setattr(budget, key, value)
    await db.flush()
    return BudgetResponse(**{c.key: getattr(budget, c.key) for c in budget.__table__.columns})


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    budget = await crud.get_budget(db, budget_id, user.tenant_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
    return None


# ── Dashboard ────────────────────────────────────────────────

@router.get("/dashboard", response_model=FinancialSummary)
async def get_financial_dashboard(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    summary = await crud.get_financial_summary(db, user.tenant_id)
    return FinancialSummary(**summary)


# ── Recurring ────────────────────────────────────────────────

@router.post("/recurring/process")
async def process_recurring(
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Process due recurring invoices (triggered by cron or manual)."""
    count = await crud.process_recurring_invoices(db, user.tenant_id)
    return {"message": f"Processed {count} recurring invoices"}


# ── Stripe Checkout ──────────────────────────────────────────

@router.post("/invoices/{invoice_id}/checkout")
async def create_checkout(
    invoice_id: str,
    success_url: str = Query("/finances?paid=true"),
    cancel_url: str = Query("/finances?cancelled=true"),
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session so a member can pay an invoice online."""
    from app.modules.finances.stripe_checkout import create_checkout_session
    from app.modules.members.models import MemberProfile, User
    from sqlalchemy import select

    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Members can only pay their own invoices
    if str(invoice.member_id) != str(user.sub):
        # Check if the user's member profile matches
        result = await db.execute(
            select(MemberProfile).where(
                MemberProfile.id == invoice.member_id,
                MemberProfile.tenant_id == user.tenant_id,
            )
        )
        profile = result.scalar_one_or_none()
        if not profile or profile.user_id != user.sub:
            raise HTTPException(status_code=403, detail="Not your invoice")

    if invoice.status.value == "paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")
    if invoice.status.value == "cancelled":
        raise HTTPException(status_code=400, detail="Invoice is cancelled")

    remaining = float(invoice.total) - float(invoice.amount_paid or 0)
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="No balance due")

    # Get member email
    member_email = ""
    member_name = ""
    if invoice.member and invoice.member.user:
        member_email = invoice.member.user.email
        member_name = f"{invoice.member.user.first_name} {invoice.member.user.last_name}"
    else:
        raise HTTPException(status_code=400, detail="Member email not found")

    checkout = await create_checkout_session(
        invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        amount_cents=int(remaining * 100),
        currency=invoice.currency.lower(),
        customer_email=member_email,
        customer_name=member_name,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"tenant_id": user.tenant_id},
    )

    if not checkout:
        raise HTTPException(status_code=502, detail="Payment gateway unavailable. Check Stripe configuration.")

    return checkout


# ── Member Self-Service: Invoices ───────────────────────────

@router.get("/my/invoices")
async def get_my_invoices(
    status_filter: str | None = Query(None, alias="status"),
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Get current member's own invoices."""
    from app.modules.members.models import MemberProfile
    from sqlalchemy import select

    result = await db.execute(
        select(MemberProfile).where(
            MemberProfile.user_id == user.sub,
            MemberProfile.tenant_id == user.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Member profile not found")

    invoices, total = await crud.list_invoices(
        db, user.tenant_id, member_id=profile.id, status=status_filter
    )
    return {"items": invoices, "total": total}


@router.get("/my/invoices/{invoice_id}")
async def get_my_invoice(
    invoice_id: str,
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific invoice for the current member."""
    from app.modules.members.models import MemberProfile
    from sqlalchemy import select

    result = await db.execute(
        select(MemberProfile).where(
            MemberProfile.user_id == user.sub,
            MemberProfile.tenant_id == user.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Member profile not found")

    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if str(invoice.member_id) != str(profile.id):
        raise HTTPException(status_code=403, detail="Not your invoice")

    member_name = ""
    if invoice.member and invoice.member.user:
        member_name = f"{invoice.member.user.first_name} {invoice.member.user.last_name}"
    return InvoiceResponse(
        **{c.key: getattr(invoice, c.key) for c in invoice.__table__.columns},
        member_name=member_name,
    )


@router.get("/my/invoices/{invoice_id}/pdf")
async def download_my_invoice_pdf(
    invoice_id: str,
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Member can download PDF for their own invoice."""
    from fastapi.responses import Response
    from app.core.pdf import generate_invoice_pdf
    from app.modules.members.models import MemberProfile
    from sqlalchemy import select

    result = await db.execute(
        select(MemberProfile).where(
            MemberProfile.user_id == user.sub,
            MemberProfile.tenant_id == user.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Member profile not found")

    invoice = await crud.get_invoice(db, invoice_id, user.tenant_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if str(invoice.member_id) != str(profile.id):
        raise HTTPException(status_code=403, detail="Not your invoice")

    member_name = ""
    member_email = ""
    if invoice.member and invoice.member.user:
        member_name = f"{invoice.member.user.first_name} {invoice.member.user.last_name}"
        member_email = invoice.member.user.email

    line_items = invoice.line_items or []
    if not line_items and invoice.subtotal:
        line_items = [{"description": "Membership Dues", "quantity": 1, "unit_price": float(invoice.subtotal), "amount": float(invoice.subtotal)}]

    association_name = user.tenant_id.replace('-', ' ').title()

    pdf_data = generate_invoice_pdf({
        "association_name": association_name,
        "invoice_number": invoice.invoice_number,
        "status": invoice.status.value if invoice.status else "pending",
        "issued_at": invoice.issued_at.strftime("%B %d, %Y") if invoice.issued_at else "—",
        "due_at": invoice.due_at.strftime("%B %d, %Y") if invoice.due_at else "—",
        "member_name": member_name,
        "member_email": member_email,
        "member_address": "",
        "line_items": line_items,
        "subtotal": float(invoice.subtotal or 0),
        "tax_rate": float(invoice.tax_rate or 0),
        "tax_amount": float(invoice.tax_amount or 0),
        "discount_amount": float(invoice.discount_amount or 0),
        "total": float(invoice.total or 0),
        "amount_paid": float(invoice.amount_paid or 0),
        "balance_due": float(invoice.total or 0) - float(invoice.amount_paid or 0),
        "currency": invoice.currency or "USD",
        "currency_symbol": "$",
        "notes": invoice.notes or "",
        "payment_instructions": "Payment is due within 30 days. Pay online at https://ams.14.jugaar.ai/finances",
        "generated_at": datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC"),
    })

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{invoice.invoice_number}.pdf"'},
    )


# ── Member Self-Service: Events ─────────────────────────────

@router.get("/my/events")
async def get_my_events(
    user: TokenPayload = Depends(require_member),
    db: AsyncSession = Depends(get_db),
):
    """Get events the current member is registered for."""
    from app.modules.events.models import EventRegistration, Event
    from sqlalchemy import select

    result = await db.execute(
        select(Event)
        .join(EventRegistration, EventRegistration.event_id == Event.id)
        .where(
            EventRegistration.member_id == user.sub,
            EventRegistration.tenant_id == user.tenant_id,
            EventRegistration.status != "cancelled",
        )
        .order_by(Event.start_date.desc())
    )
    events = result.scalars().all()

    return [
        {
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "start_date": e.start_date.isoformat() if e.start_date else None,
            "end_date": e.end_date.isoformat() if e.end_date else None,
            "location": e.location,
            "event_type": str(e.event_type),
        }
        for e in events
    ]


# ═══════════════════════════════════════════════════════════════
# Discount Codes
# ═══════════════════════════════════════════════════════════════

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DiscountCodeCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # percentage or fixed
    value: float
    max_uses: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    applicable_to: str = "both"  # event, membership, both
    is_active: bool = True


class DiscountCodeApply(BaseModel):
    code: str
    amount: float


@router.get("/discount-codes")
async def list_discount_codes(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List all discount codes (admin)."""
    from app.modules.finances.models import DiscountCode
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(DiscountCode).where(DiscountCode.tenant_id == user.tenant_id).order_by(DiscountCode.created_at.desc())
    )
    codes = result.scalars().all()
    return {
        "items": [
            {
                "id": str(c.id),
                "code": c.code,
                "discount_type": c.discount_type,
                "value": c.value,
                "max_uses": c.max_uses,
                "used_count": c.used_count,
                "valid_from": c.valid_from.isoformat() if c.valid_from else None,
                "valid_to": c.valid_to.isoformat() if c.valid_to else None,
                "applicable_to": c.applicable_to,
                "is_active": c.is_active,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in codes
        ]
    }


@router.post("/discount-codes")
async def create_discount_code(
    data: DiscountCodeCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a discount code (admin)."""
    from app.modules.finances.models import DiscountCode
    from sqlalchemy import select as sa_select
    # Check duplicate
    existing = await db.execute(
        sa_select(DiscountCode).where(
            DiscountCode.code == data.code.upper(),
            DiscountCode.tenant_id == user.tenant_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Code already exists")

    dc = DiscountCode(
        code=data.code.upper(),
        discount_type=data.discount_type,
        value=data.value,
        max_uses=data.max_uses,
        valid_from=data.valid_from,
        valid_to=data.valid_to,
        applicable_to=data.applicable_to,
        is_active=data.is_active,
        tenant_id=user.tenant_id,
        created_by=user.sub,
    )
    db.add(dc)
    await db.commit()
    await db.refresh(dc)
    return {"id": str(dc.id), "code": dc.code, "status": "created"}


@router.patch("/discount-codes/{code_id}")
async def update_discount_code(
    code_id: str,
    data: DiscountCodeCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a discount code (admin)."""
    from app.modules.finances.models import DiscountCode
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(DiscountCode).where(DiscountCode.id == code_id, DiscountCode.tenant_id == user.tenant_id)
    )
    dc = result.scalar_one_or_none()
    if not dc:
        raise HTTPException(status_code=404, detail="Not found")
    dc.code = data.code.upper()
    dc.discount_type = data.discount_type
    dc.value = data.value
    dc.max_uses = data.max_uses
    dc.valid_from = data.valid_from
    dc.valid_to = data.valid_to
    dc.applicable_to = data.applicable_to
    dc.is_active = data.is_active
    await db.commit()
    return {"status": "updated"}


@router.delete("/discount-codes/{code_id}", status_code=204)
async def delete_discount_code(
    code_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a discount code (admin)."""
    from app.modules.finances.models import DiscountCode
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(DiscountCode).where(DiscountCode.id == code_id, DiscountCode.tenant_id == user.tenant_id)
    )
    dc = result.scalar_one_or_none()
    if not dc:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(dc)
    await db.commit()
    return None


@router.post("/discounts/apply")
async def apply_discount(
    data: DiscountCodeApply,
    db: AsyncSession = Depends(get_db),
):
    """Apply a discount code and return discounted amount."""
    from app.modules.finances.models import DiscountCode
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(DiscountCode).where(
            DiscountCode.code == data.code.upper(),
            DiscountCode.is_active == True,
        )
    )
    dc = result.scalar_one_or_none()
    if not dc:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    if dc.max_uses and dc.used_count >= dc.max_uses:
        raise HTTPException(status_code=400, detail="Code has been fully redeemed")
    if dc.valid_to and dc.valid_to < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code has expired")

    if dc.discount_type == "percentage":
        discount = data.amount * (dc.value / 100)
    else:
        discount = min(dc.value, data.amount)

    return {
        "code": dc.code,
        "discount_type": dc.discount_type,
        "discount_value": dc.value,
        "discount_amount": round(discount, 2),
        "original_amount": data.amount,
        "final_amount": round(data.amount - discount, 2),
    }


# ═══════════════════════════════════════════════════════════════
# Refund Processing (Task 3.3)
# ═══════════════════════════════════════════════════════════════

class RefundRequest(BaseModel):
    reason: str = ""


@router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    data: RefundRequest,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Process a refund for a payment."""
    from app.modules.finances.models import Payment, Invoice
    from sqlalchemy import select as sa_select

    result = await db.execute(
        sa_select(Payment).where(Payment.id == payment_id, Payment.tenant_id == user.tenant_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status == "refunded":
        raise HTTPException(status_code=400, detail="Already refunded")

    # Mark payment as refunded
    payment.status = "refunded"
    payment.notes = f"Refunded by {user.sub}: {data.reason}" if data.reason else f"Refunded by {user.sub}"

    # Update invoice balance if linked
    if payment.invoice_id:
        inv_result = await db.execute(
            sa_select(Invoice).where(Invoice.id == payment.invoice_id)
        )
        invoice = inv_result.scalar_one_or_none()
        if invoice:
            invoice.amount_paid = max(0, (invoice.amount_paid or 0) - (payment.amount or 0))
            if invoice.amount_paid <= 0:
                invoice.status = "refunded"

    await db.commit()
    return {
        "status": "refunded",
        "payment_id": str(payment.id),
        "amount": float(payment.amount or 0),
        "reason": data.reason,
    }


# ═══════════════════════════════════════════════════════════════
# Financial Reports (Task 3.4)
# ═══════════════════════════════════════════════════════════════

@router.get("/reports/revenue-summary")
async def revenue_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Revenue summary from payments."""
    from app.modules.finances.models import Payment
    from sqlalchemy import select as sa_select, func as sqlfunc

    query = sa_select(
        sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0).label("total"),
        sqlfunc.count(Payment.id).label("count"),
    ).where(
        Payment.tenant_id == user.tenant_id,
        Payment.status.in_(["completed", "succeeded"]),
    )
    if start_date:
        query = query.where(Payment.payment_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(Payment.payment_date <= datetime.fromisoformat(end_date))

    result = await db.execute(query)
    row = result.one()

    # Breakdown by method
    method_query = await db.execute(
        sa_select(
            Payment.payment_method,
            sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0),
            sqlfunc.count(Payment.id),
        ).where(
            Payment.tenant_id == user.tenant_id,
            Payment.status.in_(["completed", "succeeded"]),
        ).group_by(Payment.payment_method)
    )
    methods = [{"method": str(r[0]), "total": float(r[1]), "count": r[2]} for r in method_query.all()]

    return {
        "total_revenue": float(row[0]),
        "total_payments": row[1],
        "by_method": methods,
        "period": {"start": start_date, "end": end_date},
    }


@router.get("/reports/expense-summary")
async def expense_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Expense summary."""
    from app.modules.finances.models import Expense, ExpenseStatus
    from sqlalchemy import select as sa_select, func as sqlfunc

    query = sa_select(
        sqlfunc.coalesce(sqlfunc.sum(Expense.amount), 0).label("total"),
        sqlfunc.count(Expense.id).label("count"),
    ).where(
        Expense.tenant_id == user.tenant_id,
        Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]),
    )
    if start_date:
        query = query.where(Expense.expense_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(Expense.expense_date <= datetime.fromisoformat(end_date))

    result = await db.execute(query)
    row = result.one()

    # By category
    cat_query = await db.execute(
        sa_select(
            Expense.category,
            sqlfunc.coalesce(sqlfunc.sum(Expense.amount), 0),
            sqlfunc.count(Expense.id),
        ).where(
            Expense.tenant_id == user.tenant_id,
            Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]),
        ).group_by(Expense.category)
    )
    categories = [{"category": str(r[0]), "total": float(r[1]), "count": r[2]} for r in cat_query.all()]

    return {
        "total_expenses": float(row[0]),
        "total_entries": row[1],
        "by_category": categories,
        "period": {"start": start_date, "end": end_date},
    }


@router.get("/reports/profit-loss")
async def profit_loss(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Profit & Loss report."""
    from app.modules.finances.models import Payment, Expense, ExpenseStatus
    from sqlalchemy import select as sa_select, func as sqlfunc

    # Revenue
    rev_query = sa_select(sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0)).where(
        Payment.tenant_id == user.tenant_id,
        Payment.status.in_(["completed", "succeeded"]),
    )
    if start_date:
        rev_query = rev_query.where(Payment.payment_date >= datetime.fromisoformat(start_date))
    if end_date:
        rev_query = rev_query.where(Payment.payment_date <= datetime.fromisoformat(end_date))
    revenue = (await db.execute(rev_query)).scalar() or 0

    # Expenses
    exp_query = sa_select(sqlfunc.coalesce(sqlfunc.sum(Expense.amount), 0)).where(
        Expense.tenant_id == user.tenant_id,
        Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]),
    )
    if start_date:
        exp_query = exp_query.where(Expense.expense_date >= datetime.fromisoformat(start_date))
    if end_date:
        exp_query = exp_query.where(Expense.expense_date <= datetime.fromisoformat(end_date))
    expenses = (await db.execute(exp_query)).scalar() or 0

    return {
        "revenue": float(revenue),
        "expenses": float(expenses),
        "net_income": float(revenue) - float(expenses),
        "margin": round((float(revenue) - float(expenses)) / float(revenue) * 100, 1) if revenue else 0,
        "period": {"start": start_date, "end": end_date},
    }


# ═══════════════════════════════════════════════════════════════
# Payment Receipt PDF (Task 3.2)
# ═══════════════════════════════════════════════════════════════

@router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(
    payment_id: str,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a receipt PDF for a payment."""
    from fastapi.responses import Response
    from app.modules.finances.models import Payment, PaymentStatus
    from sqlalchemy import select as sa_select

    result = await db.execute(
        sa_select(Payment).where(Payment.id == payment_id, Payment.tenant_id == user.tenant_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    from app.core.pdf import generate_receipt_pdf
    receipt_data = {
        "receipt_number": f"REC-{str(payment.id)[:8].upper()}",
        "date": payment.payment_date.strftime("%B %d, %Y") if payment.payment_date else "N/A",
        "amount": float(payment.amount or 0),
        "method": str(payment.payment_method) if payment.payment_method else "N/A",
        "status": str(payment.status),
        "reference": payment.stripe_payment_id or "N/A",
        "tenant_name": "AssocHub",
    }
    pdf_bytes = generate_receipt_pdf(receipt_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"receipt-{payment_id[:8]}.pdf\""},
    )
