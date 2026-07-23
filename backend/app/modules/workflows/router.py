"""Workflows routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin, require_staff, get_current_user, TokenPayload
from app.core.database import get_db
from app.modules.workflows import crud
from app.modules.workflows.schemas import (
    ActionTemplateCreate,
    ActionTemplateResponse,
    WorkflowCreate,
    WorkflowResponse,
    WorkflowRunDetail,
    WorkflowRunResponse,
    WorkflowStats,
    WorkflowUpdate,
)

router = APIRouter()


# ── Action Templates (before /{workflow_id}) ────────────────

@router.get("/templates", response_model=list[ActionTemplateResponse])
async def list_templates(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    templates = await crud.list_action_templates(db, user.tenant_id)
    return [ActionTemplateResponse.model_validate(t) for t in templates]


@router.post("/templates", response_model=ActionTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: ActionTemplateCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    template = await crud.create_action_template(db, user.tenant_id, data.model_dump())
    return ActionTemplateResponse.model_validate(template)


# ── Process Delays (before /{workflow_id}) ──────────────────

@router.post("/process-delays")
async def process_delays(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Process delayed workflow runs that are ready to resume."""
    count = await crud.process_delays(db, user.tenant_id)
    return {"message": f"Resumed {count} delayed runs"}


# ── Run by ID (before /{workflow_id}) ───────────────────────

@router.get("/runs/{run_id}", response_model=WorkflowRunDetail)
async def get_run_detail(
    run_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    run = await crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return WorkflowRunDetail.model_validate(run)


@router.post("/runs/{run_id}/resume")
async def resume_run(
    run_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    run = await crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status.value != "waiting":
        raise HTTPException(status_code=400, detail="Run is not in waiting state")
    run.status = "running"
    await crud.execute_run(db, run_id)
    return {"message": "Run resumed"}


@router.post("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    run = await crud.cancel_run(db, run_id)
    if not run:
        raise HTTPException(status_code=400, detail="Run cannot be cancelled")
    return {"message": "Run cancelled"}


# ── Workflows CRUD ───────────────────────────────────────────

@router.get("/")
async def list_workflows(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_workflows(
        db, user.tenant_id, status=status_filter, page=page, per_page=per_page
    )
    return {"items": [WorkflowResponse.model_validate(w) for w in items], "total": total}


@router.get("/stats", response_model=WorkflowStats)
async def get_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stats = await crud.get_workflow_stats(db, user.tenant_id)
    return WorkflowStats(**stats)


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    workflow = await crud.create_workflow(db, user.tenant_id, user.sub, data.model_dump())
    return WorkflowResponse.model_validate(workflow)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    workflow = await crud.get_workflow(db, workflow_id, user.tenant_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse.model_validate(workflow)


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    workflow = await crud.update_workflow(
        db, workflow_id, user.tenant_id, data.model_dump(exclude_unset=True)
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse.model_validate(workflow)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.update_workflow(db, workflow_id, user.tenant_id, {"status": "archived"})
    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow not found")


# ── Workflow Execution ───────────────────────────────────────

@router.post("/{workflow_id}/trigger", response_model=WorkflowRunResponse)
async def trigger_workflow(
    workflow_id: str,
    trigger_data: dict | None = None,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a workflow execution."""
    try:
        run = await crud.trigger_workflow(db, workflow_id, user.tenant_id, trigger_data or {})
        await crud.execute_run(db, run.id)
        return WorkflowRunResponse.model_validate(run)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{workflow_id}/pause")
async def pause_workflow(
    workflow_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    workflow = await crud.update_workflow(db, workflow_id, user.tenant_id, {"status": "paused"})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow paused"}


@router.post("/{workflow_id}/activate")
async def activate_workflow(
    workflow_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    workflow = await crud.update_workflow(db, workflow_id, user.tenant_id, {"status": "active"})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow activated"}


@router.get("/{workflow_id}/runs")
async def list_workflow_runs(
    workflow_id: str,
    limit: int = Query(50, ge=1, le=200),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    runs = await crud.list_runs(db, workflow_id, limit=limit)
    return [WorkflowRunResponse.model_validate(r) for r in runs]
