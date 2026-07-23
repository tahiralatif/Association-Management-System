"""Elections routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin, require_staff, get_current_user, TokenPayload
from app.core.database import get_db
from app.modules.elections import crud
from app.modules.elections.schemas import (
    BallotResponse,
    CastBallot,
    ElectionCreate,
    ElectionResponse,
    ElectionStats,
    ElectionUpdate,
    NominationCreate,
    NominationResponse,
    PositionCreate,
    PositionResponse,
    ResultResponse,
)

router = APIRouter()


# ── Elections ────────────────────────────────────────────────

@router.get("/")
async def list_elections(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_elections(db, user.tenant_id, status=status_filter, page=page, per_page=per_page)
    return {"items": [ElectionResponse.model_validate(e) for e in items], "total": total}


@router.get("/stats", response_model=ElectionStats)
async def get_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stats = await crud.get_election_stats(db, user.tenant_id)
    return ElectionStats(**stats)


@router.get("/{election_id}", response_model=ElectionResponse)
async def get_election(
    election_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.get_election(db, election_id, user.tenant_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return ElectionResponse.model_validate(election)


@router.post("/", response_model=ElectionResponse, status_code=status.HTTP_201_CREATED)
async def create_election(
    data: ElectionCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.create_election(db, user.tenant_id, user.sub, data.model_dump())
    return ElectionResponse.model_validate(election)


@router.patch("/{election_id}", response_model=ElectionResponse)
async def update_election(
    election_id: str,
    data: ElectionUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.get_election(db, election_id, user.tenant_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(election, key, value)
    await db.flush()
    return ElectionResponse.model_validate(election)


@router.post("/{election_id}/open-nominations")
async def open_nominations(
    election_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.update_election_status(db, election_id, user.tenant_id, "nominations_open")
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return {"message": "Nominations opened"}


@router.post("/{election_id}/start-voting")
async def start_voting(
    election_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.update_election_status(db, election_id, user.tenant_id, "voting")
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return {"message": "Voting started", "eligible_voters": election.total_eligible_voters}


@router.post("/{election_id}/close")
async def close_election(
    election_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.update_election_status(db, election_id, user.tenant_id, "closed")
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return {"message": "Election closed", "quorum_met": election.quorum_met, "total_votes": election.total_votes_cast}


@router.post("/{election_id}/publish-results")
async def publish_results(
    election_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    results = await crud.tally_results(db, election_id, user.tenant_id)
    await crud.update_election_status(db, election_id, user.tenant_id, "results_published")
    return {"message": "Results published", "positions": len(results)}


# ── Positions ────────────────────────────────────────────────

@router.get("/{election_id}/positions", response_model=list[PositionResponse])
async def list_positions(
    election_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    election = await crud.get_election(db, election_id, user.tenant_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return [PositionResponse.model_validate(p) for p in election.positions]


@router.post("/{election_id}/positions", response_model=PositionResponse, status_code=status.HTTP_201_CREATED)
async def add_position(
    election_id: str,
    data: PositionCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    pos = await crud.create_position(db, election_id, user.tenant_id, data.model_dump())
    return PositionResponse.model_validate(pos)


# ── Nominations ──────────────────────────────────────────────

@router.get("/{election_id}/nominations")
async def list_nominations(
    election_id: str,
    position_id: str | None = Query(None),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    noms = await crud.list_nominations(db, election_id, position_id)
    return [{"id": n.id, "member_id": n.member_id, "position_id": n.position_id,
             "position_title": n.position.title if n.position else "",
             "member_name": f"{n.member.user.first_name} {n.member.user.last_name}" if n.member and hasattr(n.member, 'user') and n.member.user else "",
             "status": n.status.value, "statement": n.statement,
             "nominated_at": n.nominated_at.isoformat()} for n in noms]


@router.post("/{election_id}/nominate", response_model=NominationResponse, status_code=status.HTTP_201_CREATED)
async def submit_nomination(
    election_id: str,
    data: NominationCreate,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        nom = await crud.create_nomination(db, election_id, user.sub, user.tenant_id, data.model_dump())
        return NominationResponse(
            id=nom.id, election_id=nom.election_id, position_id=nom.position_id,
            member_id=nom.member_id, status=nom.status.value,
            statement=nom.statement, qualifications=nom.qualifications,
            nominated_at=nom.nominated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/nominations/{nomination_id}/accept")
async def accept_nomination(
    nomination_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    nom = await crud.update_nomination_status(db, nomination_id, "accepted")
    if not nom:
        raise HTTPException(status_code=404, detail="Nomination not found")
    return {"message": "Nomination accepted"}


@router.post("/nominations/{nomination_id}/decline")
async def decline_nomination(
    nomination_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    nom = await crud.update_nomination_status(db, nomination_id, "declined")
    if not nom:
        raise HTTPException(status_code=404, detail="Nomination not found")
    return {"message": "Nomination declined"}


# ── Voting ───────────────────────────────────────────────────

@router.post("/{election_id}/vote", response_model=BallotResponse, status_code=status.HTTP_201_CREATED)
async def cast_vote(
    election_id: str,
    data: CastBallot,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        ballot = await crud.cast_ballot(db, election_id, user.sub, user.tenant_id, data.model_dump())
        return BallotResponse(id=ballot.id, election_id=ballot.election_id,
                              verification_code=ballot.verification_code, cast_at=ballot.cast_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{election_id}/vote-status")
async def vote_status(
    election_id: str,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_voter_status(db, election_id, user.sub)


# ── Results ──────────────────────────────────────────────────

@router.get("/{election_id}/results")
async def get_results(
    election_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    results = await crud.get_results(db, election_id)
    return [ResultResponse(
        id=r.id, election_id=r.election_id, position_id=r.position_id,
        position_title=r.position.title if r.position else "",
        total_votes=r.total_votes, results_detail=r.results_detail,
        winners=r.winners, is_final=r.is_final, published_at=r.published_at,
    ) for r in results]
