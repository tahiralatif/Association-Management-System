"""File storage — local filesystem with S3-ready interface.

Switch STORAGE_BACKEND=local or STORAGE_BACKEND=s3 in .env.
Local mode stores files under STORAGE_LOCAL_PATH (default: /data/uploads/).
"""

import hashlib
import mimetypes
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

# Try to import httpx for S3 mode; optional for local mode
try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

# Storage root
LOCAL_ROOT = Path(getattr(settings, "STORAGE_LOCAL_PATH", "/data/uploads"))

# Allowed file types (configurable via env)
MAX_UPLOAD_SIZE_MB = int(getattr(settings, "MAX_UPLOAD_SIZE_MB", 50))
MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024

# Blocked extensions (executables, scripts)
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs", ".js",
    ".msi", ".com", ".scr", ".pif", ".ws", ".wsh",
}


class LocalStorage:
    """Local filesystem storage — no external dependencies."""

    def __init__(self, root: Path = LOCAL_ROOT):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _tenant_dir(self, tenant_id: str) -> Path:
        """Get/create tenant-specific directory."""
        d = self.root / tenant_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _safe_filename(self, original: str) -> str:
        """Generate a safe UUID-based filename, preserving extension."""
        ext = Path(original).suffix.lower()
        return f"{uuid.uuid4().hex}{ext}"

    async def upload_file(
        self,
        tenant_id: str,
        data: bytes,
        original_filename: str,
        content_type: str | None = None,
        folder: str = "",
    ) -> dict:
        """Upload a file to local storage."""
        # Validate size
        if len(data) > MAX_UPLOAD_SIZE:
            raise ValueError(f"File too large: {len(data)} bytes (max {MAX_UPLOAD_SIZE_MB}MB)")

        # Validate extension
        ext = Path(original_filename).suffix.lower()
        if ext in BLOCKED_EXTENSIONS:
            raise ValueError(f"File type not allowed: {ext}")

        if not content_type:
            content_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

        safe_name = self._safe_filename(original_filename)
        rel_path = f"{folder}/{safe_name}" if folder else safe_name

        tenant_dir = self._tenant_dir(tenant_id)
        full_path = tenant_dir / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        full_path.write_bytes(data)

        return {
            "storage_path": f"{tenant_id}/{rel_path}",
            "file_name": original_filename,
            "file_size": len(data),
            "file_type": content_type,
            "checksum": hashlib.sha256(data).hexdigest(),
            "url": f"/api/v1/documents/file/{tenant_id}/{rel_path}",
        }

    async def download_file(self, storage_path: str) -> tuple[bytes, str]:
        """Download a file. Returns (data, content_type)."""
        full_path = self.root / storage_path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {storage_path}")

        data = full_path.read_bytes()
        content_type = mimetypes.guess_type(str(full_path))[0] or "application/octet-stream"
        return data, content_type

    async def delete_file(self, storage_path: str) -> bool:
        """Delete a file."""
        full_path = self.root / storage_path
        if full_path.exists():
            full_path.unlink()
            return True
        return False

    async def get_file_info(self, storage_path: str) -> dict | None:
        """Get file metadata without reading content."""
        full_path = self.root / storage_path
        if not full_path.exists():
            return None

        stat = full_path.stat()
        return {
            "size": stat.st_size,
            "content_type": mimetypes.guess_type(str(full_path))[0] or "application/octet-stream",
            "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        }

    async def copy_file(self, src_path: str, dst_path: str) -> bool:
        """Copy a file within storage."""
        src = self.root / src_path
        dst = self.root / dst_path
        if not src.exists():
            return False
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(src), str(dst))
        return True


class S3Storage:
    """S3/MinIO compatible storage — requires httpx."""

    def __init__(self):
        if not httpx:
            raise ImportError("httpx required for S3 storage")
        self.endpoint = settings.S3_ENDPOINT
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket = settings.S3_BUCKET
        self.region = settings.S3_REGION

    async def upload_file(
        self,
        tenant_id: str,
        data: bytes,
        original_filename: str,
        content_type: str | None = None,
        folder: str = "",
    ) -> dict:
        safe_name = f"{uuid.uuid4().hex}{Path(original_filename).suffix.lower()}"
        key = f"{tenant_id}/{folder}/{safe_name}" if folder else f"{tenant_id}/{safe_name}"

        if not content_type:
            content_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{key}"
            response = await client.put(url, data=data, headers={"Content-Type": content_type}, timeout=60)
            response.raise_for_status()

        return {
            "storage_path": key,
            "file_name": original_filename,
            "file_size": len(data),
            "file_type": content_type,
            "checksum": hashlib.sha256(data).hexdigest(),
            "url": f"/api/v1/documents/file/{key}",
        }

    async def download_file(self, storage_path: str) -> tuple[bytes, str]:
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{storage_path}"
            response = await client.get(url, timeout=60)
            response.raise_for_status()
            ct = response.headers.get("content-type", "application/octet-stream")
            return response.content, ct

    async def delete_file(self, storage_path: str) -> bool:
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{storage_path}"
            response = await client.delete(url, timeout=30)
            return response.status_code in (200, 204)

    async def get_file_info(self, storage_path: str) -> dict | None:
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{storage_path}"
            response = await client.head(url, timeout=10)
            if response.status_code == 200:
                return {
                    "size": int(response.headers.get("content-length", 0)),
                    "content_type": response.headers.get("content-type", ""),
                    "last_modified": response.headers.get("last-modified", ""),
                }
        return None

    async def copy_file(self, src_path: str, dst_path: str) -> bool:
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{src_path}"
            response = await client.get(url, timeout=60)
            if response.status_code != 200:
                return False
            dest_url = f"{self.endpoint}/{self.bucket}/{dst_path}"
            resp2 = await client.put(dest_url, data=response.content,
                                     headers={"Content-Type": response.headers.get("content-type", "")}, timeout=60)
            return resp2.status_code in (200, 201)


def get_storage():
    """Factory: returns local or S3 storage based on config."""
    backend = getattr(settings, "STORAGE_BACKEND", "local")
    if backend == "s3":
        return S3Storage()
    return LocalStorage()


# Singleton
storage = get_storage()
