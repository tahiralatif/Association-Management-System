"""Automated database backup system — pg_dump, rotation, restore."""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
import gzip
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path

from app.config import settings

log = logging.getLogger(__name__)

BACKUP_DIR = Path(settings.BACKUP_DIR)
RETENTION_DAILY = settings.BACKUP_RETENTION_DAYS  # days
RETENTION_WEEKLY = settings.BACKUP_RETENTION_WEEKLY  # weeks


def _parse_db_url(url: str) -> dict:
    """Extract DB connection info from SQLAlchemy URL."""
    # postgresql+asyncpg://user:pass@host:port/dbname
    url = url.replace("postgresql+asyncpg://", "").replace("postgresql://", "")
    parts = url.split("@")
    if len(parts) != 2:
        raise ValueError(f"Invalid DB URL: {url}")
    user_pass, host_db = parts
    user, password = user_pass.split(":", 1)
    host_port, dbname = host_db.split("/", 1)
    host, port = host_port.split(":", 1) if ":" in host_port else (host_port, "5432")
    return {"user": user, "password": password, "host": host, "port": port, "dbname": dbname}


def run_backup() -> dict:
    """Run a pg_dump backup, compress it, and return the result."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    db_info = _parse_db_url(settings.DATABASE_URL)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"assochub_{timestamp}.sql.gz"
    filepath = BACKUP_DIR / filename

    env = os.environ.copy()
    env["PGPASSWORD"] = db_info["password"]

    cmd = [
        "pg_dump",
        "-h", db_info["host"],
        "-p", db_info["port"],
        "-U", db_info["user"],
        "-d", db_info["dbname"],
        "--no-owner",
        "--no-privileges",
        "-F", "plain",  # plain SQL (not custom format)
    ]

    log.info("Starting backup: %s", filename)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 min timeout
            env=env,
        )

        if result.returncode != 0:
            log.error("pg_dump failed: %s", result.stderr)
            return {"success": False, "error": result.stderr, "file": filename}

        # Compress
        sql_data = result.stdout.encode("utf-8")
        with gzip.open(filepath, "wb") as f:
            f.write(sql_data)

        size_mb = filepath.stat().st_size / (1024 * 1024)
        log.info("Backup complete: %s (%.2f MB)", filename, size_mb)

        return {
            "success": True,
            "file": filename,
            "path": str(filepath),
            "size_mb": round(size_mb, 2),
            "timestamp": timestamp,
        }

    except subprocess.TimeoutExpired:
        log.error("Backup timed out after 5 minutes")
        return {"success": False, "error": "Backup timed out", "file": filename}
    except Exception as e:
        log.exception("Backup failed: %s", e)
        return {"success": False, "error": str(e), "file": filename}


def cleanup_old_backups() -> dict:
    """Remove backups older than retention policy."""
    if not BACKUP_DIR.exists():
        return {"removed": 0}

    now = datetime.now(timezone.utc)
    removed = 0

    for f in BACKUP_DIR.glob("assochub_*.sql.gz"):
        # Parse timestamp from filename
        try:
            ts_str = f.name.replace("assochub_", "").replace(".sql.gz", "")
            file_time = datetime.strptime(ts_str, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        age_days = (now - file_time).days

        # Keep weekly backups for RETENTION_WEEKLY weeks
        is_weekly = file_time.weekday() == 0 and file_time.hour < 3  # Monday before 3 AM

        if age_days > RETENTION_DAILY:
            if is_weekly and age_days <= RETENTION_WEEKLY * 7:
                continue  # Keep weekly backup
            f.unlink()
            removed += 1
            log.info("Removed old backup: %s (age: %d days)", f.name, age_days)

    return {"removed": removed}


def list_backups() -> list[dict]:
    """List all available backups."""
    if not BACKUP_DIR.exists():
        return []

    backups = []
    for f in sorted(BACKUP_DIR.glob("assochub_*.sql.gz"), reverse=True):
        try:
            ts_str = f.name.replace("assochub_", "").replace(".sql.gz", "")
            file_time = datetime.strptime(ts_str, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        backups.append({
            "filename": f.name,
            "path": str(f),
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "created_at": file_time.isoformat(),
            "age_days": (datetime.now(timezone.utc) - file_time).days,
        })

    return backups


async def restore_backup(filename: str) -> dict:
    """Restore a backup by running the SQL file against the database."""
    filepath = BACKUP_DIR / filename
    if not filepath.exists():
        return {"success": False, "error": "Backup file not found"}

    db_info = _parse_db_url(settings.DATABASE_URL)
    env = os.environ.copy()
    env["PGPASSWORD"] = db_info["password"]

    log.info("Restoring backup: %s", filename)

    try:
        # Decompress and pipe to psql
        with gzip.open(filepath, "rb") as f:
            sql_data = f.read()

        result = subprocess.run(
            [
                "psql",
                "-h", db_info["host"],
                "-p", db_info["port"],
                "-U", db_info["user"],
                "-d", db_info["dbname"],
            ],
            input=sql_data,
            capture_output=True,
            timeout=600,  # 10 min timeout
            env=env,
        )

        if result.returncode != 0:
            log.error("Restore failed: %s", result.stderr.decode())
            return {"success": False, "error": result.stderr.decode()}

        log.info("Restore complete: %s", filename)
        return {"success": True, "file": filename}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Restore timed out"}
    except Exception as e:
        log.exception("Restore failed: %s", e)
        return {"success": False, "error": str(e)}
