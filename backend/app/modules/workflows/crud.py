"""Workflows CRUD."""

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.workflows.models import (
    RunStatus,
    Workflow,
    WorkflowActionTemplate,
    WorkflowDelay,
    WorkflowRun,
    WorkflowStatus,
)


# ── Workflows ────────────────────────────────────────────────

async def create_workflow(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Workflow:
    workflow = Workflow(tenant_id=tenant_id, created_by=creator_id, **data)
    db.add(workflow)
    await db.flush()
    return workflow


async def list_workflows(
    db: AsyncSession, tenant_id: str, status: str | None = None, page: int = 1, per_page: int = 20
) -> tuple[list[Workflow], int]:
    query = select(Workflow).where(Workflow.tenant_id == tenant_id)
    if status:
        query = query.where(Workflow.status == status)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Workflow.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


async def get_workflow(db: AsyncSession, workflow_id: str, tenant_id: str) -> Workflow | None:
    result = await db.execute(
        select(Workflow)
        .options(selectinload(Workflow.runs))
        .where(Workflow.id == workflow_id, Workflow.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_workflow(db: AsyncSession, workflow_id: str, tenant_id: str, data: dict) -> Workflow | None:
    workflow = await get_workflow(db, workflow_id, tenant_id)
    if not workflow:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(workflow, key, value)
    await db.flush()
    return workflow


# ── Execution ────────────────────────────────────────────────

async def trigger_workflow(
    db: AsyncSession, workflow_id: str, tenant_id: str, trigger_data: dict
) -> WorkflowRun:
    """Start a new workflow run."""
    workflow = await get_workflow(db, workflow_id, tenant_id)
    if not workflow or workflow.status != WorkflowStatus.ACTIVE:
        raise ValueError("Workflow not found or not active")

    steps = workflow.steps or []
    run = WorkflowRun(
        workflow_id=workflow_id,
        tenant_id=tenant_id,
        total_steps=len(steps),
        trigger_data=trigger_data,
        status=RunStatus.PENDING,
    )
    db.add(run)

    # Update stats
    workflow.total_runs += 1
    workflow.last_run_at = datetime.now(timezone.utc)

    await db.flush()
    return run


async def execute_run(db: AsyncSession, run_id: str) -> WorkflowRun | None:
    """Execute the next step in a workflow run."""
    result = await db.execute(
        select(WorkflowRun).options(selectinload(WorkflowRun.workflow))
        .where(WorkflowRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run or run.status == RunStatus.SUCCESS:
        return None

    workflow = run.workflow
    steps = workflow.steps or []
    step_results = run.step_results or []

    if run.current_step >= len(steps):
        # All steps complete
        run.status = RunStatus.SUCCESS
        run.completed_at = datetime.now(timezone.utc)
        workflow.successful_runs += 1
        await db.flush()
        return run

    # Execute current step
    step = steps[run.current_step]
    step_type = step.get("type", "")
    step_config = step.get("config", {})

    step_result = {
        "step": run.current_step,
        "type": step_type,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        if step_type == "condition":
            # Evaluate condition
            result_val = _evaluate_condition(step.get("condition", {}), run.context or {})
            step_result["result"] = result_val
            step_result["passed"] = result_val

        elif step_type == "wait":
            duration = step_config.get("duration_days", 1)
            resume_at = datetime.now(timezone.utc) + timedelta(days=duration)
            delay = WorkflowDelay(
                workflow_id=workflow.id,
                run_id=run.id,
                tenant_id=run.tenant_id,
                step_index=run.current_step,
                resume_at=resume_at,
            )
            db.add(delay)
            run.status = RunStatus.WAITING
            step_result["resume_at"] = resume_at.isoformat()

        elif step_type == "send_email":
            # In production: queue email via Celery
            step_result["queued"] = True
            step_result["template"] = step_config.get("template_id", "")

        elif step_type == "send_notification":
            step_result["sent"] = True

        elif step_type == "update_member":
            step_result["updated"] = True

        elif step_type == "add_to_group":
            step_result["added"] = True

        elif step_type == "webhook_call":
            step_result["called"] = True
            step_result["url"] = step_config.get("url", "")

        elif step_type == "ai_action":
            step_result["processed"] = True
            step_result["action"] = step_config.get("action", "")

        else:
            step_result["skipped"] = True
            step_result["reason"] = f"Unknown step type: {step_type}"

        step_result["completed_at"] = datetime.now(timezone.utc).isoformat()
        step_results.append(step_result)
        run.step_results = step_results

        # Move to next step if not waiting
        if run.status != RunStatus.WAITING:
            run.current_step += 1
            if run.current_step >= len(steps):
                run.status = RunStatus.SUCCESS
                run.completed_at = datetime.now(timezone.utc)
                workflow.successful_runs += 1
            else:
                run.status = RunStatus.RUNNING

    except Exception as e:
        step_result["error"] = str(e)
        step_results.append(step_result)
        run.step_results = step_results
        run.status = RunStatus.FAILED
        run.error_message = str(e)
        run.error_step = run.current_step
        workflow.failed_runs += 1

    await db.flush()
    return run


def _evaluate_condition(condition: dict, context: dict) -> bool:
    """Evaluate a workflow condition."""
    field = condition.get("field", "")
    operator = condition.get("operator", "equals")
    value = condition.get("value")

    actual = context.get(field)

    if operator == "equals":
        return actual == value
    elif operator == "not_equals":
        return actual != value
    elif operator == "contains":
        return str(value) in str(actual) if actual else False
    elif operator == "greater_than":
        return float(actual) > float(value) if actual else False
    elif operator == "less_than":
        return float(actual) < float(value) if actual else False
    elif operator == "is_true":
        return bool(actual)
    elif operator == "is_false":
        return not bool(actual)
    return False


# ── Runs ─────────────────────────────────────────────────────

async def list_runs(
    db: AsyncSession, workflow_id: str, status: str | None = None, limit: int = 50
) -> list[WorkflowRun]:
    query = select(WorkflowRun).where(WorkflowRun.workflow_id == workflow_id)
    if status:
        query = query.where(WorkflowRun.status == status)
    query = query.order_by(WorkflowRun.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_run(db: AsyncSession, run_id: str) -> WorkflowRun | None:
    result = await db.execute(
        select(WorkflowRun).where(WorkflowRun.id == run_id)
    )
    return result.scalar_one_or_none()


async def cancel_run(db: AsyncSession, run_id: str) -> WorkflowRun | None:
    run = await get_run(db, run_id)
    if not run or run.status in (RunStatus.SUCCESS, RunStatus.CANCELLED):
        return None
    run.status = RunStatus.CANCELLED
    run.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return run


async def process_delays(db: AsyncSession, tenant_id: str) -> int:
    """Resume delayed workflow runs whose wait period has elapsed."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(WorkflowDelay).where(
            WorkflowDelay.tenant_id == tenant_id,
            WorkflowDelay.is_resumed == False,
            WorkflowDelay.resume_at <= now,
        )
    )
    delays = list(result.scalars().all())
    count = 0
    for delay in delays:
        run_result = await db.execute(
            select(WorkflowRun).where(WorkflowRun.id == delay.run_id)
        )
        run = run_result.scalar_one_or_none()
        if run and run.status == RunStatus.WAITING:
            run.status = RunStatus.RUNNING
            run.current_step = delay.step_index + 1
            delay.is_resumed = True
            count += 1

            # Continue execution
            await execute_run(db, run.id)

    await db.flush()
    return count


# ── Action Templates ─────────────────────────────────────────

async def create_action_template(db: AsyncSession, tenant_id: str, data: dict) -> WorkflowActionTemplate:
    template = WorkflowActionTemplate(tenant_id=tenant_id, **data)
    db.add(template)
    await db.flush()
    return template


async def list_action_templates(db: AsyncSession, tenant_id: str) -> list[WorkflowActionTemplate]:
    result = await db.execute(
        select(WorkflowActionTemplate)
        .where(WorkflowActionTemplate.tenant_id == tenant_id)
        .order_by(WorkflowActionTemplate.name)
    )
    return list(result.scalars().all())


# ── Stats ────────────────────────────────────────────────────

async def get_workflow_stats(db: AsyncSession, tenant_id: str) -> dict:
    total = await db.execute(
        select(func.count()).select_from(Workflow).where(Workflow.tenant_id == tenant_id)
    )
    total_workflows = total.scalar() or 0

    active = await db.execute(
        select(func.count())
        .select_from(Workflow)
        .where(Workflow.tenant_id == tenant_id, Workflow.status == WorkflowStatus.ACTIVE)
    )
    active_workflows = active.scalar() or 0

    # Runs today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    runs_today = await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .join(Workflow)
        .where(Workflow.tenant_id == tenant_id, WorkflowRun.created_at >= today_start)
    )
    total_runs_today = runs_today.scalar() or 0

    # Success rate
    all_runs = await db.execute(
        select(func.count()).select_from(WorkflowRun)
        .join(Workflow).where(Workflow.tenant_id == tenant_id)
    )
    total_runs = all_runs.scalar() or 0

    success_runs = await db.execute(
        select(func.count()).select_from(WorkflowRun)
        .join(Workflow).where(Workflow.tenant_id == tenant_id, WorkflowRun.status == RunStatus.SUCCESS)
    )
    success_count = success_runs.scalar() or 0
    success_rate = (success_count / total_runs * 100) if total_runs else 0

    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "total_runs_today": total_runs_today,
        "success_rate": round(success_rate, 1),
        "average_execution_time": 0,
        "recent_runs": [],
        "top_workflows": [],
    }
