"""File storage service — S3/MinIO compatible file operations."""

import hashlib
import mimetypes
from datetime import datetime, timezone
from io import BytesIO

import httpx
from app.config import settings


class FileStorage:
    """S3-compatible file storage using MinIO or AWS S3."""

    def __init__(self):
        self.endpoint = settings.S3_ENDPOINT
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket = settings.S3_BUCKET
        self.region = settings.S3_REGION

    def _headers(self, method: str, content_type: str = "", date: str = "") -> dict:
        """Generate auth headers for S3 API calls (simplified AWS SigV4)."""
        # In production, use boto3 or aws-requests-auth for proper SigV4
        return {
            "Date": date,
            "Content-Type": content_type,
        }

    async def upload_file(
        self,
        key: str,
        data: bytes,
        content_type: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Upload a file to storage."""
        if not content_type:
            content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"

        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{key}"
            headers = {"Content-Type": content_type}
            if metadata:
                for k, v in metadata.items():
                    headers[f"x-amz-meta-{k}"] = str(v)

            response = await client.put(url, content=data, headers=headers, timeout=60)

            return {
                "key": key,
                "size": len(data),
                "content_type": content_type,
                "checksum": hashlib.sha256(data).hexdigest(),
                "url": f"{self.endpoint}/{self.bucket}/{key}",
            }

    async def download_file(self, key: str) -> bytes:
        """Download a file from storage."""
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{key}"
            response = await client.get(url, timeout=60)
            response.raise_for_status()
            return response.content

    async def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{key}"
            response = await client.delete(url, timeout=30)
            return response.status_code in (200, 204)

    async def generate_presigned_url(self, key: str, expires: int = 3600) -> str:
        """Generate a pre-signed URL for direct access."""
        # In production, use proper SigV4 signing
        return f"{self.endpoint}/{self.bucket}/{key}"

    async def list_files(self, prefix: str = "", limit: int = 100) -> list[dict]:
        """List files with a given prefix."""
        # Simplified — in production use S3 listObjectsV2
        return []

    async def get_file_info(self, key: str) -> dict | None:
        """Get file metadata."""
        async with httpx.AsyncClient() as client:
            url = f"{self.endpoint}/{self.bucket}/{key}"
            response = await client.head(url, timeout=10)
            if response.status_code == 200:
                return {
                    "key": key,
                    "content_type": response.headers.get("content-type", ""),
                    "size": int(response.headers.get("content-length", 0)),
                    "last_modified": response.headers.get("last-modified", ""),
                }
            return None


# Singleton
storage = FileStorage()
