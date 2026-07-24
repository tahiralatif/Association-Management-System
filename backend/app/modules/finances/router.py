"""Financial routes — API endpoints."""

from datetime import datetime
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

    # Find member profile for this user
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
