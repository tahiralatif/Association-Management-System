"""Documents routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin, require_staff, get_current_user, TokenPayload
from app.core.database import get_db
from app.modules.documents import crud
from app.modules.documents.schemas import (
    CategoryCreate,
    CategoryResponse,
    CommentCreate,
    CommentResponse,
    DocumentCreate,
    DocumentResponse,
    DocumentStats,
    DocumentUpdate,
    ShareCreate,
    ShareResponse,
    VersionUpload,
    VersionResponse,
)

router = APIRouter()


# ── Categories ───────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    cats = await crud.list_categories(db, user.tenant_id)
    return [CategoryResponse.model_validate(c) for c in cats]


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cat = await crud.create_category(db, user.tenant_id, data.model_dump())
    return CategoryResponse.model_validate(cat)


# ── Documents ────────────────────────────────────────────────

@router.get("/")
async def list_documents(
    category_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    doc_type: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_documents(
        db, user.tenant_id, category_id=category_id, status=status_filter,
        doc_type=doc_type, search=search, page=page, per_page=per_page,
    )
    return {"items": [DocumentResponse.model_validate(d) for d in items], "total": total}


@router.get("/stats", response_model=DocumentStats)
async def get_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stats = await crud.get_document_stats(db, user.tenant_id)
    return DocumentStats(**stats)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.get_document(db, document_id, user.tenant_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Look up member profile for activity logging
    from sqlalchemy import select
    from app.modules.members.models import MemberProfile
    mp = await db.execute(select(MemberProfile.id).where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id).limit(1))
    member_id = mp.scalar_one_or_none()
    if member_id:
        await crud.log_activity(db, document_id, member_id, user.tenant_id, "view")
    return DocumentResponse.model_validate(doc)


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: DocumentCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.create_document(db, user.tenant_id, user.sub, data.model_dump())
    return DocumentResponse.model_validate(doc)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    data: DocumentUpdate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.update_document(db, document_id, user.tenant_id, data.model_dump(exclude_unset=True))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await crud.delete_document(db, document_id, user.tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}


# ── Versions ─────────────────────────────────────────────────

@router.get("/{document_id}/versions", response_model=list[VersionResponse])
async def list_versions(
    document_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    versions = await crud.list_versions(db, document_id)
    return [VersionResponse.model_validate(v) for v in versions]


@router.post("/{document_id}/versions", response_model=VersionResponse, status_code=status.HTTP_201_CREATED)
async def upload_new_version(
    document_id: str,
    data: VersionUpload,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        version = await crud.create_version(db, document_id, user.tenant_id, user.sub, data.model_dump())
        return VersionResponse.model_validate(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Comments ─────────────────────────────────────────────────

@router.get("/{document_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    document_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    comments = await crud.list_comments(db, document_id)
    return [CommentResponse.model_validate(c) for c in comments]


@router.post("/{document_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    document_id: str,
    data: CommentCreate,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Resolve user to member_profile id
    from app.modules.members.models import MemberProfile
    result = await db.execute(select(MemberProfile).where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id))
    mp = result.scalar_one_or_none()
    member_id = mp.id if mp else user.sub
    comment = await crud.add_comment(db, document_id, member_id, user.tenant_id, data.model_dump())
    return CommentResponse.model_validate(comment)


# ── Sharing ──────────────────────────────────────────────────

@router.get("/{document_id}/shares", response_model=list[ShareResponse])
async def list_shares(
    document_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    shares = await crud.list_shares(db, document_id)
    return [ShareResponse.model_validate(s) for s in shares]


@router.post("/{document_id}/share", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
@router.post("/{document_id}/shares", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def share_document(
    document_id: str,
    data: ShareCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    share = await crud.share_document(db, document_id, user.sub, user.tenant_id, data.model_dump())
    return ShareResponse.model_validate(share)


@router.delete("/shares/{share_id}")
async def revoke_share(
    share_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    ok = await crud.revoke_share(db, share_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Share not found")
    return {"message": "Share revoked"}


# ── Downloads ────────────────────────────────────────────────

@router.post("/{document_id}/download")
async def track_download(
    document_id: str,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.get_document(db, document_id, user.tenant_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    from sqlalchemy import select
    from app.modules.members.models import MemberProfile
    mp = await db.execute(select(MemberProfile.id).where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id).limit(1))
    member_id = mp.scalar_one_or_none()
    if member_id:
        await crud.log_activity(db, document_id, member_id, user.tenant_id, "download")
    return {"download_url": doc.file_url, "file_name": doc.file_name}
