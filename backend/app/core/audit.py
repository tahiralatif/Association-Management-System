"""Audit trail service — records business-level mutations to audit_logs table."""

import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("assochub.audit")


async def log_audit_event(
    db: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Write an audit log entry. Called after successful mutations.

    Args:
        db: Async database session
        tenant_id: Tenant performing the action
        user_id: User performing the action (None for system actions)
        action: Action performed (create, update, delete, login, export, etc.)
        resource_type: Type of resource (member, invoice, event, etc.)
        resource_id: ID of the specific resource affected
        details: Additional context (old/new values, reason, etc.)
        ip_address: Client IP address
    """
    try:
        await db.execute(
            text("""
                INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
                VALUES (:id, :tenant_id, :user_id, :action, :resource_type, :resource_id, :details, :ip_address, :created_at)
            """),
            {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details or {},
                "ip_address": ip_address,
                "created_at": datetime.now(timezone.utc),
            },
        )
    except Exception as e:
        # Audit logging should never crash the request
        logger.warning("Failed to write audit log: %s", e)


async def log_member_event(
    db: AsyncSession, tenant_id: str, user_id: str, action: str,
    member_id: str, details: dict | None = None, ip: str | None = None,
) -> None:
    """Convenience wrapper for member-related audit events."""
    await log_audit_event(db, tenant_id, user_id, action, "member", member_id, details, ip)


async def log_financial_event(
    db: AsyncSession, tenant_id: str, user_id: str, action: str,
    resource_type: str, resource_id: str, details: dict | None = None, ip: str | None = None,
) -> None:
    """Convenience wrapper for financial audit events."""
    await log_audit_event(db, tenant_id, user_id, action, resource_type, resource_id, details, ip)


async def log_auth_event(
    db: AsyncSession, tenant_id: str, user_id: str, action: str,
    details: dict | None = None, ip: str | None = None,
) -> None:
    """Convenience wrapper for auth audit events (login, logout, password change)."""
    await log_audit_event(db, tenant_id, user_id, action, "auth", user_id, details, ip)


async def log_system_event(
    db: AsyncSession, tenant_id: str, action: str,
    resource_type: str, resource_id: str | None = None,
    details: dict | None = None,
) -> None:
    """For system-triggered actions (cron jobs, automated processes)."""
    await log_audit_event(db, tenant_id, None, action, resource_type, resource_id, details)
