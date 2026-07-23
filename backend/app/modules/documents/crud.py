"""Documents CRUD."""

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.documents.models import (
    Document,
    DocumentActivity,
    DocumentCategory,
    DocumentComment,
    DocumentShare,
    DocumentStatus,
    DocumentVersion,
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:300]


# ── Categories ───────────────────────────────────────────────

async def create_category(db: AsyncSession, tenant_id: str, data: dict) -> DocumentCategory:
    cat = DocumentCategory(tenant_id=tenant_id, slug=slugify(data.get("name", "")), **data)
    db.add(cat)
    await db.flush()
    return cat


async def list_categories(db: AsyncSession, tenant_id: str) -> list[DocumentCategory]:
    result = await db.execute(
        select(DocumentCategory)
        .where(DocumentCategory.tenant_id == tenant_id)
        .order_by(DocumentCategory.sort_order, DocumentCategory.name)
    )
    return list(result.scalars().all())


# ── Documents ────────────────────────────────────────────────

async def create_document(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Document:
    # Normalize document_type to uppercase for enum compatibility
    if "document_type" in data:
        data["document_type"] = data["document_type"].upper()
    # Normalize status to uppercase
    if "status" in data:
        data["status"] = data["status"].upper()
    doc = Document(
        tenant_id=tenant_id,
        created_by=creator_id,
        slug=slugify(data.get("title", "")),
        **data,
    )
    db.add(doc)
    await db.flush()

    # Update category count
    if doc.category_id:
        cat_result = await db.execute(
            select(DocumentCategory).where(DocumentCategory.id == doc.category_id)
        )
        cat = cat_result.scalar_one_or_none()
        if cat:
            cat.document_count += 1

    return doc


async def list_documents(
    db: AsyncSession, tenant_id: str, category_id: str | None = None,
    status: str | None = None, doc_type: str | None = None,
    search: str | None = None, page: int = 1, per_page: int = 20,
) -> tuple[list[Document], int]:
    query = select(Document).where(Document.tenant_id == tenant_id, Document.status != DocumentStatus.DELETED)
    if category_id:
        query = query.where(Document.category_id == category_id)
    if status:
        query = query.where(Document.status == status)
    if doc_type:
        query = query.where(Document.document_type == doc_type)
    if search:
        query = query.where(Document.title.ilike(f"%{search}%"))

    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Document.updated_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


async def get_document(db: AsyncSession, document_id: str, tenant_id: str) -> Document | None:
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.versions),
            selectinload(Document.comments),
        )
        .where(Document.id == document_id, Document.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_document(db: AsyncSession, document_id: str, tenant_id: str, data: dict) -> Document | None:
    doc = await get_document(db, document_id, tenant_id)
    if not doc:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(doc, key, value)
    await db.flush()
    return doc


async def delete_document(db: AsyncSession, document_id: str, tenant_id: str) -> bool:
    doc = await get_document(db, document_id, tenant_id)
    if not doc:
        return False
    doc.status = DocumentStatus.DELETED
    await db.flush()
    return True


# ── Versioning ───────────────────────────────────────────────

async def create_version(db: AsyncSession, document_id: str, tenant_id: str, creator_id: str, data: dict) -> DocumentVersion:
    doc = await get_document(db, document_id, tenant_id)
    if not doc:
        raise ValueError("Document not found")

    new_version = doc.version + 1
    version = DocumentVersion(
        document_id=document_id,
        tenant_id=tenant_id,
        version=new_version,
        created_by=creator_id,
        **data,
    )
    db.add(version)

    # Update document
    doc.version = new_version
    doc.file_name = data.get("file_name", doc.file_name)
    doc.file_size = data.get("file_size", doc.file_size)
    doc.file_url = data.get("file_url", doc.file_url)
    doc.storage_path = data.get("storage_path", doc.storage_path)

    await db.flush()
    return version


async def list_versions(db: AsyncSession, document_id: str) -> list[DocumentVersion]:
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version.desc())
    )
    return list(result.scalars().all())


# ── Comments ─────────────────────────────────────────────────

async def add_comment(
    db: AsyncSession, document_id: str, member_id: str, tenant_id: str, data: dict
) -> DocumentComment:
    comment = DocumentComment(document_id=document_id, member_id=member_id, tenant_id=tenant_id, **data)
    db.add(comment)
    await db.flush()
    return comment


async def list_comments(db: AsyncSession, document_id: str) -> list[DocumentComment]:
    result = await db.execute(
        select(DocumentComment)
        .where(DocumentComment.document_id == document_id, DocumentComment.parent_id == None)
        .order_by(DocumentComment.created_at.desc())
    )
    return list(result.scalars().all())


# ── Sharing ──────────────────────────────────────────────────

async def share_document(
    db: AsyncSession, document_id: str, shared_by: str, tenant_id: str, data: dict
) -> DocumentShare:
    # Map schema field to model field
    share_data = {
        "shared_with": data.get("user_id"),
        "permission": data.get("permission", "view"),
        "expires_at": data.get("expires_at"),
    }
    share = DocumentShare(document_id=document_id, shared_by=shared_by, tenant_id=tenant_id, **share_data)
    db.add(share)
    await db.flush()
    return share


async def list_shares(db: AsyncSession, document_id: str) -> list[DocumentShare]:
    result = await db.execute(
        select(DocumentShare).where(DocumentShare.document_id == document_id)
    )
    return list(result.scalars().all())


async def revoke_share(db: AsyncSession, share_id: str) -> bool:
    result = await db.execute(select(DocumentShare).where(DocumentShare.id == share_id))
    share = result.scalar_one_or_none()
    if not share:
        return False
    await db.delete(share)
    await db.flush()
    return True


# ── Activity ─────────────────────────────────────────────────

async def log_activity(
    db: AsyncSession, document_id: str, member_id: str, tenant_id: str, action: str, details: dict | None = None
) -> DocumentActivity:
    activity = DocumentActivity(
        document_id=document_id, member_id=member_id, tenant_id=tenant_id,
        action=action, details=details,
    )
    db.add(activity)

    # Update counters
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if doc:
        if action == "view":
            doc.view_count += 1
        elif action == "download":
            doc.download_count += 1

    await db.flush()
    return activity


# ── Stats ────────────────────────────────────────────────────

async def get_document_stats(db: AsyncSession, tenant_id: str) -> dict:
    total = await db.execute(
        select(func.count())
        .select_from(Document)
        .where(Document.tenant_id == tenant_id, Document.status != DocumentStatus.DELETED)
    )
    total_documents = total.scalar() or 0

    views = await db.execute(
        select(func.coalesce(func.sum(Document.view_count), 0))
        .where(Document.tenant_id == tenant_id)
    )
    total_views = int(views.scalar())

    downloads = await db.execute(
        select(func.coalesce(func.sum(Document.download_count), 0))
        .where(Document.tenant_id == tenant_id)
    )
    total_downloads = int(downloads.scalar())

    size = await db.execute(
        select(func.coalesce(func.sum(Document.file_size), 0))
        .where(Document.tenant_id == tenant_id)
    )
    total_size = int(size.scalar())

    return {
        "total_documents": total_documents,
        "total_views": total_views,
        "total_downloads": total_downloads,
        "total_size": total_size,
        "recent_documents": [],
        "top_categories": [],
        "storage_breakdown": {},
    }
