"""Celery tasks for automated backups."""

import logging
from celery import shared_task

log = logging.getLogger(__name__)


@shared_task(name="app.tasks.backup_ml.daily_backup")
def daily_backup():
    """Run daily database backup with rotation."""
    from app.core.backup import run_backup, cleanup_old_backups

    log.info("Starting daily backup")
    result = run_backup()

    if result["success"]:
        log.info("Daily backup complete: %s (%.2f MB)", result["file"], result["size_mb"])
        cleanup = cleanup_old_backups()
        log.info("Cleaned up %d old backups", cleanup["removed"])
    else:
        log.error("Daily backup failed: %s", result.get("error"))

    return result
