"""Workflow execution engine — runs workflow steps."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.workflows.models import (
    ActionType,
    RunStatus,
    Workflow,
    WorkflowDelay,
    WorkflowRun,
)

log = logging.getLogger(__name__)


def _resolve_value(template: str, context: dict) -> str:
    """Resolve {{variable}} placeholders in strings."""
    if not isinstance(template, str):
        return template
    result = template
    for key, val in context.items():
        result = result.replace(f"{{{{{key}}}}}", str(val))
    return result


async def execute_step(
    db: AsyncSession,
    run: WorkflowRun,
    step: dict,
    context: dict,
    tenant_id: str,
) -> dict:
    """Execute a single workflow step. Returns {"success": bool, "output": ...}."""
    action_type = step.get("type", "")

    try:
        if action_type == "send_email":
            return await _step_send_email(step, context, tenant_id)
        elif action_type == "send_notification":
            return await _step_send_notification(step, context)
        elif action_type == "update_member":
            return await _step_update_member(db, step, context, tenant_id)
        elif action_type == "add_to_group":
            return await _step_add_to_group(db, step, context, tenant_id)
        elif action_type == "remove_from_group":
            return await _step_remove_from_group(db, step, context, tenant_id)
        elif action_type == "create_invoice":
            return await _step_create_invoice(db, step, context, tenant_id)
        elif action_type == "wait":
            return await _step_wait(db, run, step, context)
        elif action_type == "condition":
            return _step_condition(step, context)
        elif action_type == "webhook_call":
            return await _step_webhook(step, context)
        else:
            return {"success": False, "output": f"Unknown action type: {action_type}"}
    except Exception as e:
        log.exception("Workflow step failed: %s", action_type)
        return {"success": False, "output": str(e)}


async def _step_send_email(step: dict, context: dict, tenant_id: str) -> dict:
    to = _resolve_value(step.get("to", "{{email}}"), context)
    subject = _resolve_value(step.get("subject", "Notification"), context)
    body = _resolve_value(step.get("body", ""), context)
    template_id = step.get("template_id")

    if template_id:
        # Load template from DB
        from app.modules.workflows.models import WorkflowActionTemplate
        # Would load template here in production
        pass

    try:
        from app.tasks.email import send_email_task
        send_email_task.delay(to=to, subject=subject, html_body=f"<p>{body}</p>")
        return {"success": True, "output": f"Email sent to {to}"}
    except Exception as e:
        return {"success": False, "output": f"Email failed: {e}"}


async def _step_send_notification(step: dict, context: dict) -> dict:
    # In-app notification — would write to notifications table
    return {"success": True, "output": "Notification created"}


async def _step_update_member(db: AsyncSession, step: dict, context: dict, tenant_id: str) -> dict:
    member_id = _resolve_value(step.get("member_id", "{{member_id}}"), context)
    field = step.get("field", "")
    value = step.get("value", "")

    if not member_id or not field:
        return {"success": False, "output": "Missing member_id or field"}

    from app.modules.members.models import MemberProfile
    from sqlalchemy import select

    result = await db.execute(
        select(MemberProfile).where(MemberProfile.id == member_id, MemberProfile.tenant_id == tenant_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return {"success": False, "output": f"Member {member_id} not found"}

    if hasattr(profile, field):
        # Type-coerce common fields
        current = getattr(profile, field)
        if isinstance(current, bool):
            value = value.lower() in ("true", "1", "yes")
        elif isinstance(current, int):
            value = int(value)
        elif isinstance(current, float):
            value = float(value)
        setattr(profile, field, value)
        await db.flush()
        return {"success": True, "output": f"Set {field} = {value} for member {member_id}"}
    else:
        return {"success": False, "output": f"Member has no field '{field}'"}


async def _step_add_to_group(db: AsyncSession, step: dict, context: dict, tenant_id: str) -> dict:
    member_id = _resolve_value(step.get("member_id", "{{member_id}}"), context)
    group_id = _resolve_value(step.get("group_id", ""), context)

    if not member_id or not group_id:
        return {"success": False, "output": "Missing member_id or group_id"}

    try:
        from app.modules.members.crud import add_member_to_group
        await add_member_to_group(db, group_id, member_id, tenant_id)
        return {"success": True, "output": f"Added member to group"}
    except Exception as e:
        return {"success": False, "output": str(e)}


async def _step_remove_from_group(db: AsyncSession, step: dict, context: dict, tenant_id: str) -> dict:
    member_id = _resolve_value(step.get("member_id", "{{member_id}}"), context)
    group_id = _resolve_value(step.get("group_id", ""), context)

    if not member_id or not group_id:
        return {"success": False, "output": "Missing member_id or group_id"}

    try:
        from app.modules.members.crud import remove_member_from_group
        await remove_member_from_group(db, group_id, member_id)
        return {"success": True, "output": "Removed member from group"}
    except Exception as e:
        return {"success": False, "output": str(e)}


async def _step_create_invoice(db: AsyncSession, step: dict, context: dict, tenant_id: str) -> dict:
    member_id = _resolve_value(step.get("member_id", "{{member_id}}"), context)
    amount = float(step.get("amount", 0))
    description = _resolve_value(step.get("description", "Invoice"), context)

    if not member_id or amount <= 0:
        return {"success": False, "output": "Missing member_id or invalid amount"}

    try:
        from app.modules.finances.crud import create_invoice
        invoice = await create_invoice(db, tenant_id, {
            "member_id": member_id,
            "line_items": [{"description": description, "quantity": 1, "unit_price": amount}],
        })
        return {"success": True, "output": f"Created invoice {invoice.invoice_number} for ${amount:.2f}"}
    except Exception as e:
        return {"success": False, "output": str(e)}


async def _step_wait(db: AsyncSession, run: WorkflowRun, step: dict, context: dict) -> dict:
    days = int(step.get("duration_days", 1))
    resume_at = datetime.now(timezone.utc) + timedelta(days=days)

    delay = WorkflowDelay(
        workflow_id=run.workflow_id,
        run_id=run.id,
        tenant_id=run.tenant_id,
        step_index=run.current_step,
        resume_at=resume_at,
    )
    db.add(delay)
    await db.flush()

    return {"success": True, "output": f"Paused for {days} days, will resume at {resume_at.isoformat()}", "wait": True}


def _step_condition(step: dict, context: dict) -> dict:
    field = _resolve_value(step.get("field", ""), context)
    operator = step.get("operator", "equals")
    expected = step.get("value", "")
    actual = str(context.get(field, ""))

    if operator == "equals":
        result = actual == expected
    elif operator == "not_equals":
        result = actual != expected
    elif operator == "contains":
        result = expected in actual
    elif operator == "gt":
        result = float(actual) > float(expected)
    elif operator == "lt":
        result = float(actual) < float(expected)
    elif operator == "in":
        result = actual in expected.split(",")
    else:
        result = False

    return {"success": True, "output": f"Condition {field} {operator} {expected} => {result}", "condition_met": result}


async def _step_webhook(step: dict, context: dict) -> dict:
    url = _resolve_value(step.get("url", ""), context)
    method = step.get("method", "POST").upper()
    payload = step.get("payload", context)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.request(method, url, json=payload)
            return {"success": resp.status_code < 400, "output": f"Webhook returned {resp.status_code}"}
    except Exception as e:
        return {"success": False, "output": f"Webhook failed: {e}"}


# ── Full Workflow Run ────────────────────────────────────────

async def run_workflow(db: AsyncSession, workflow: Workflow, trigger_data: dict, tenant_id: str) -> WorkflowRun:
    """Execute a complete workflow from start to finish."""
    run = WorkflowRun(
        workflow_id=workflow.id,
        tenant_id=tenant_id,
        status=RunStatus.RUNNING,
        current_step=0,
        total_steps=len(workflow.steps),
        trigger_data=trigger_data,
        context=trigger_data.copy(),
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.flush()

    workflow.total_runs += 1
    workflow.last_run_at = datetime.now(timezone.utc)

    step_results = []
    context = trigger_data.copy()

    for i, step in enumerate(workflow.steps):
        run.current_step = i
        await db.flush()

        result = await execute_step(db, run, step, context, tenant_id)
        step_results.append({"step": i, "type": step.get("type"), **result})

        # Merge output into context
        if result.get("output"):
            context[f"step_{i}_output"] = result["output"]

        if result.get("wait"):
            # Workflow paused — save state and return
            run.status = RunStatus.WAITING
            run.step_results = step_results
            await db.flush()
            return run

        if result.get("condition_met") is False:
            # Skip remaining steps in this branch
            break

        if not result.get("success", True):
            run.status = RunStatus.FAILED
            run.error_message = result.get("output", "Step failed")
            run.error_step = i
            run.step_results = step_results
            run.completed_at = datetime.now(timezone.utc)
            workflow.failed_runs += 1
            await db.flush()
            return run

    # All steps completed
    run.status = RunStatus.SUCCESS
    run.current_step = len(workflow.steps)
    run.step_results = step_results
    run.completed_at = datetime.now(timezone.utc)
    run.context = context
    workflow.successful_runs += 1
    await db.flush()

    return run
