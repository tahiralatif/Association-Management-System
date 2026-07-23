"""Elections CRUD."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.elections.models import (
    Ballot,
    Election,
    ElectionPosition,
    ElectionResult,
    ElectionStatus,
    Nomination,
    NominationStatus,
)


# ── Elections ────────────────────────────────────────────────

async def create_election(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Election:
    election = Election(tenant_id=tenant_id, created_by=creator_id, **data)
    db.add(election)
    await db.flush()
    return election


async def list_elections(
    db: AsyncSession, tenant_id: str, status: str | None = None, page: int = 1, per_page: int = 20
) -> tuple[list[Election], int]:
    query = select(Election).where(Election.tenant_id == tenant_id)
    if status:
        # Map friendly frontend names to actual backend enum values
        status_map = {
            "upcoming": ["nominations_open", "draft"],
            "active": ["voting"],
            "completed": ["closed", "results_published"],
        }
        mapped = status_map.get(status, [status])
        # Validate against actual enum values
        valid = {s.value for s in ElectionStatus}
        mapped = [s for s in mapped if s in valid]
        if mapped:
            query = query.where(Election.status.in_(mapped))
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Election.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


async def get_election(db: AsyncSession, election_id: str, tenant_id: str) -> Election | None:
    result = await db.execute(
        select(Election)
        .options(selectinload(Election.positions), selectinload(Election.nominations), selectinload(Election.ballots))
        .where(Election.id == election_id, Election.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_election_status(db: AsyncSession, election_id: str, tenant_id: str, status: str) -> Election | None:
    election = await get_election(db, election_id, tenant_id)
    if not election:
        return None
    election.status = ElectionStatus(status)
    if status == "voting":
        # Count eligible voters
        election.total_eligible_voters = await _count_eligible_voters(db, tenant_id)
    await db.flush()
    return election


async def _count_eligible_voters(db: AsyncSession, tenant_id: str) -> int:
    from app.modules.members.models import MemberProfile
    result = await db.execute(
        select(func.count()).select_from(MemberProfile).where(MemberProfile.tenant_id == tenant_id)
    )
    return result.scalar() or 0


# ── Positions ────────────────────────────────────────────────

async def create_position(db: AsyncSession, election_id: str, tenant_id: str, data: dict) -> ElectionPosition:
    pos = ElectionPosition(election_id=election_id, tenant_id=tenant_id, **data)
    db.add(pos)
    await db.flush()
    return pos


# ── Nominations ──────────────────────────────────────────────

async def create_nomination(
    db: AsyncSession, election_id: str, member_id: str, tenant_id: str, data: dict
) -> Nomination:
    # Check if already nominated for this position
    existing = await db.execute(
        select(Nomination).where(
            Nomination.election_id == election_id,
            Nomination.member_id == member_id,
            Nomination.position_id == data["position_id"],
            Nomination.status != NominationStatus.WITHDRAWN,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Already nominated for this position")

    # Verify nominations period is active
    election_result = await db.execute(select(Election).where(Election.id == election_id))
    election = election_result.scalar_one_or_none()
    if not election:
        raise ValueError("Election not found")
    now = datetime.now(timezone.utc)
    if election.nominations_close and now > election.nominations_close:
        raise ValueError("Nominations period has closed")
    if election.nominations_open and now < election.nominations_open:
        raise ValueError("Nominations period has not started")

    nom = Nomination(election_id=election_id, member_id=member_id, tenant_id=tenant_id, **data)
    db.add(nom)
    await db.flush()
    return nom


from app.modules.members.models import MemberProfile

async def list_nominations(
    db: AsyncSession, election_id: str, position_id: str | None = None
) -> list[Nomination]:
    query = (
        select(Nomination)
        .options(selectinload(Nomination.member).selectinload(MemberProfile.user), selectinload(Nomination.position))
        .where(Nomination.election_id == election_id)
    )
    if position_id:
        query = query.where(Nomination.position_id == position_id)
    query = query.order_by(Nomination.nominated_at.desc())
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def update_nomination_status(
    db: AsyncSession, nomination_id: str, status: str
) -> Nomination | None:
    result = await db.execute(select(Nomination).where(Nomination.id == nomination_id))
    nom = result.scalar_one_or_none()
    if not nom:
        return None
    nom.status = NominationStatus(status)
    nom.responded_at = datetime.now(timezone.utc)
    await db.flush()
    return nom


# ── Voting ───────────────────────────────────────────────────

async def cast_ballot(
    db: AsyncSession, election_id: str, voter_id: str, tenant_id: str, data: dict
) -> Ballot:
    # Check if already voted
    existing = await db.execute(
        select(Ballot).where(Ballot.election_id == election_id, Ballot.voter_id == voter_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Already voted in this election")

    # Verify election is in voting phase
    election_result = await db.execute(select(Election).where(Election.id == election_id))
    election = election_result.scalar_one_or_none()
    if not election or election.status != ElectionStatus.VOTING:
        raise ValueError("Election is not in voting phase")

    verification_code = str(uuid.uuid4())[:8].upper()

    ballot = Ballot(
        election_id=election_id,
        voter_id=voter_id,
        tenant_id=tenant_id,
        votes=data["votes"],
        abstentions=data.get("abstentions", []),
        verification_code=verification_code,
    )
    db.add(ballot)

    # Update vote count
    election.total_votes_cast += 1
    quorum_threshold = election.total_eligible_voters * election.quorum_percentage / 100
    election.quorum_met = election.total_votes_cast >= quorum_threshold

    await db.flush()
    return ballot


async def get_voter_status(db: AsyncSession, election_id: str, voter_id: str) -> dict:
    result = await db.execute(
        select(Ballot).where(Ballot.election_id == election_id, Ballot.voter_id == voter_id)
    )
    ballot = result.scalar_one_or_none()
    return {
        "has_voted": ballot is not None,
        "verification_code": ballot.verification_code if ballot else None,
        "cast_at": ballot.cast_at if ballot else None,
    }


# ── Results ──────────────────────────────────────────────────

async def tally_results(db: AsyncSession, election_id: str, tenant_id: str) -> list[ElectionResult]:
    """Tally votes and create results for each position."""
    election = await get_election(db, election_id, tenant_id)
    if not election:
        return []

    # Get all ballots
    ballots_result = await db.execute(select(Ballot).where(Ballot.election_id == election_id))
    ballots = list(ballots_result.scalars().all())

    # Get positions
    pos_result = await db.execute(
        select(ElectionPosition).where(ElectionPosition.election_id == election_id)
    )
    positions = list(pos_result.scalars().all())

    results = []
    for pos in positions:
        pos_id = pos.id
        votes_detail = {}
        abstentions = 0

        for ballot in ballots:
            if pos_id in ballot.abstentions:
                abstentions += 1
                continue
            if pos_id in ballot.votes:
                rank_list = ballot.votes[pos_id]
                if not isinstance(rank_list, list):
                    rank_list = [rank_list]
                for rank_idx, candidate_id in enumerate(rank_list):
                    if candidate_id not in votes_detail:
                        votes_detail[candidate_id] = {"votes": 0, "points": 0}
                    # For ranked choice: higher rank = fewer points
                    points = max(1, pos.seats - rank_idx + 1)
                    votes_detail[candidate_id]["votes"] += 1
                    votes_detail[candidate_id]["points"] += points

        total_votes = sum(v["votes"] for v in votes_detail.values())

        # Calculate percentages
        for cid in votes_detail:
            if total_votes > 0:
                votes_detail[cid]["percentage"] = round(votes_detail[cid]["votes"] / total_votes * 100, 1)
            else:
                votes_detail[cid]["percentage"] = 0

        # Sort by votes/points and determine winners
        sorted_candidates = sorted(votes_detail.items(), key=lambda x: (-x[1]["points"], -x[1]["votes"]))
        winners = [cid for cid, _ in sorted_candidates[:pos.seats]]

        for rank, (cid, data) in enumerate(sorted_candidates, 1):
            votes_detail[cid]["rank"] = rank

        # Check or create result
        existing_result = await db.execute(
            select(ElectionResult).where(
                ElectionResult.election_id == election_id,
                ElectionResult.position_id == pos_id,
            )
        )
        result_obj = existing_result.scalar_one_or_none()

        if result_obj:
            result_obj.total_votes = total_votes
            result_obj.results_detail = votes_detail
            result_obj.winners = winners
            result_obj.is_final = True
            result_obj.published_at = datetime.now(timezone.utc)
        else:
            result_obj = ElectionResult(
                election_id=election_id,
                position_id=pos_id,
                tenant_id=tenant_id,
                total_votes=total_votes,
                results_detail=votes_detail,
                winners=winners,
                is_final=True,
                published_at=datetime.now(timezone.utc),
            )
            db.add(result_obj)

        results.append(result_obj)

    await db.flush()
    return results


async def get_results(db: AsyncSession, election_id: str) -> list[ElectionResult]:
    result = await db.execute(
        select(ElectionResult)
        .options(selectinload(ElectionResult.position))
        .where(ElectionResult.election_id == election_id)
    )
    return list(result.scalars().unique().all())


# ── Stats ────────────────────────────────────────────────────

async def get_election_stats(db: AsyncSession, tenant_id: str) -> dict:
    total = await db.execute(
        select(func.count()).select_from(Election).where(Election.tenant_id == tenant_id)
    )
    total_elections = total.scalar() or 0

    active = await db.execute(
        select(func.count())
        .select_from(Election)
        .where(
            Election.tenant_id == tenant_id,
            Election.status.in_([ElectionStatus.NOMINATIONS_OPEN, ElectionStatus.VOTING]),
        )
    )
    active_elections = active.scalar() or 0

    votes = await db.execute(
        select(func.coalesce(func.sum(Election.total_votes_cast), 0))
        .where(Election.tenant_id == tenant_id)
    )
    total_votes = int(votes.scalar())

    turnout = await db.execute(
        select(
            func.coalesce(
                func.avg(
                    func.nullif(Election.total_votes_cast, 0) * 100.0 / func.nullif(Election.total_eligible_voters, 0)
                ), 0
            )
        ).where(Election.tenant_id == tenant_id)
    )
    avg_turnout = float(turnout.scalar())

    quorum = await db.execute(
        select(func.count())
        .select_from(Election)
        .where(Election.tenant_id == tenant_id, Election.quorum_met == True)
    )
    quorum_count = quorum.scalar() or 0
    quorum_rate = (quorum_count / total_elections * 100) if total_elections else 0

    return {
        "total_elections": total_elections,
        "active_elections": active_elections,
        "total_votes_cast": total_votes,
        "average_turnout": round(avg_turnout, 1),
        "quorum_met_rate": round(quorum_rate, 1),
        "recent_elections": [],
    }
