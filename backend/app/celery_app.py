"""Celery application for AssocHub background tasks."""

from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "assochub",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
    include=[
        "app.tasks.email",
        "app.tasks.workflows",
        "app.tasks.analytics",
        "app.tasks.integrations",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Retry settings
    task_default_retry_delay=60,
    task_max_retries=3,
    # Rate limiting
    task_default_rate_limit="100/m",
    # Result expiry
    result_expires=3600,
    # Beat schedule (recurring tasks)
    beat_schedule={
        "process-delayed-workflows": {
            "task": "app.tasks.workflows.process_delayed_workflows",
            "schedule": crontab(minute="*/5"),  # Every 5 minutes
        },
        "generate-daily-analytics": {
            "task": "app.tasks.analytics.generate_daily_kpi_snapshots",
            "schedule": crontab(hour=6, minute=0),  # Daily at 6 AM UTC
        },
        "sync-integration-events": {
            "task": "app.tasks.integrations.process_pending_events",
            "schedule": crontab(minute="*/2"),  # Every 2 minutes
        },
        "cleanup-old-embeddings": {
            "task": "app.tasks.ai.cleanup_old_embeddings",
            "schedule": crontab(hour=3, minute=0, day_of_week=0),  # Weekly Sunday 3 AM
        },
    },
)
