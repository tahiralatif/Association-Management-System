"""Workflow automation tasks — process delayed steps and recurring triggers."""

from celery import shared_task


@shared_task
def process_delayed_workflows():
    """Process workflow steps that were delayed. Run every 5 minutes via beat."""
    import asyncio
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.modules.workflows.models import WorkflowDelay, WorkflowRun

    async def _process():
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            result = await db.execute(
                select(WorkflowDelay).where(
                    WorkflowDelay.resume_at <= now,
                    WorkflowDelay.status == "pending",
                )
            )
            delays = result.scalars().all()

            processed = 0
            for delay in delays:
                delay.status = "processing"
                await db.commit()
                # Re-trigger the workflow step
                resume_workflow_step.delay(str(delay.workflow_run_id), delay.step_index)
                delay.status = "completed"
                processed += 1

            await db.commit()
            return {"processed": processed}

    return asyncio.get_event_loop().run_until_complete(_process())


@shared_task
def resume_workflow_step(run_id: str, step_index: int):
    """Resume a workflow step after a delay."""
    import asyncio

    async def _resume():
        # Workflow execution logic would go here
        pass

    asyncio.get_event_loop().run_until_complete(_resume())
    return {"run_id": run_id, "step_index": step_index}


@shared_task
def trigger_workflow(tenant_id: str, trigger_type: str, payload: dict):
    """Trigger matching workflows for a given event type."""
    import asyncio
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.modules.workflows.models import Workflow

    async def _trigger():
        async with async_session_factory() as db:
            result = await db.execute(
                select(Workflow).where(
                    Workflow.tenant_id == tenant_id,
                    Workflow.trigger_type == trigger_type,
                    Workflow.status == "active",
                )
            )
            workflows = result.scalars().all()
            triggered = []
            for wf in workflows:
                # Check if conditions match
                run_workflow.delay(str(wf.id), payload)
                triggered.append(str(wf.id))
            return {"triggered_workflows": triggered}

    return asyncio.get_event_loop().run_until_complete(_trigger())


@shared_task
def run_workflow(workflow_id: str, payload: dict):
    """Execute a single workflow run."""
    import asyncio

    async def _run():
        pass  # Would call the workflow execution engine

    asyncio.get_event_loop().run_until_complete(_run())
    return {"workflow_id": workflow_id, "status": "completed"}
