"""Backup management API endpoints."""

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import require_admin, TokenPayload
from app.core.backup import run_backup, cleanup_old_backups, list_backups, restore_backup

log = logging.getLogger(__name__)
router = APIRouter()


class BackupResponse(BaseModel):
    success: bool
    file: str | None = None
    path: str | None = None
    size_mb: float | None = None
    error: str | None = None


class RestoreRequest(BaseModel):
    filename: str


@router.post("/backup/run", response_model=BackupResponse)
async def trigger_backup(user: TokenPayload = Depends(require_admin)):
    """Trigger a manual database backup."""
    result = run_backup()
    return BackupResponse(**result)


@router.get("/backup/list")
async def get_backups(user: TokenPayload = Depends(require_admin)):
    """List all available backups."""
    return {"backups": list_backups()}


@router.post("/backup/cleanup")
async def cleanup_backups(user: TokenPayload = Depends(require_admin)):
    """Remove old backups according to retention policy."""
    result = cleanup_old_backups()
    return {"message": f"Cleaned up {result['removed']} old backups", **result}


@router.post("/backup/restore")
async def restore(req: RestoreRequest, user: TokenPayload = Depends(require_admin)):
    """Restore a backup (⚠️ destructive — overwrites current data)."""
    result = await restore_backup(req.filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Restore failed"))
    return {"message": f"Restored from {req.filename}", **result}
