"""Elections schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Election ─────────────────────────────────────────────────

class ElectionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    election_type: str = "board"
    nominations_open: datetime | None = None
    nominations_close: datetime | None = None
    voting_start: datetime | None = None
    voting_end: datetime | None = None
    seats_available: int = 1
    quorum_percentage: int = 33
    allow_abstain: bool = True
    secret_ballot: bool = True
    ranked_choice: bool = False
    vote_method: str = "online"


class ElectionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    seats_available: int | None = None
    quorum_percentage: int | None = None


class ElectionResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    election_type: str
    status: str
    seats_available: int
    quorum_percentage: int
    secret_ballot: bool
    ranked_choice: bool
    total_eligible_voters: int
    total_votes_cast: int
    total_votes: int = 0  # alias for frontend compat
    quorum_met: bool
    voting_start: datetime | None = None
    voting_end: datetime | None = None
    nominations_open: datetime | None = None
    nominations_close: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        d = super().model_validate(obj, **kwargs)
        d.total_votes = d.total_votes_cast
        return d


# ── Position ─────────────────────────────────────────────────

class PositionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    seats: int = 1


class PositionResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    seats: int
    sort_order: int

    model_config = {"from_attributes": True}


# ── Nomination ───────────────────────────────────────────────

class NominationCreate(BaseModel):
    position_id: str
    statement: str | None = None
    qualifications: str | None = None


class NominationResponse(BaseModel):
    id: str
    election_id: str
    position_id: str
    member_id: str
    member_name: str = ""
    position_title: str = ""
    status: str
    statement: str | None = None
    qualifications: str | None = None
    nominated_at: datetime

    model_config = {"from_attributes": True}


# ── Ballot ───────────────────────────────────────────────────

class CastBallot(BaseModel):
    """votes: {position_id: [candidate_id_rank1, candidate_id_rank2, ...]}"""
    votes: dict
    abstentions: list[str] = []


class BallotResponse(BaseModel):
    id: str
    election_id: str
    verification_code: str | None = None
    cast_at: datetime

    model_config = {"from_attributes": True}


# ── Result ───────────────────────────────────────────────────

class ResultCandidate(BaseModel):
    member_id: str
    member_name: str
    votes: int
    percentage: float = 0
    rank: int = 0


class ResultResponse(BaseModel):
    id: str
    election_id: str
    position_id: str
    position_title: str = ""
    total_votes: int
    results_detail: dict
    all_candidates: list[ResultCandidate] = []
    winners: list[str]
    winner_names: list[str] = []
    is_final: bool
    published_at: datetime | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        d = super().model_validate(obj, **kwargs)
        # Transform results_detail into all_candidates
        candidates = []
        for cid, detail in (d.results_detail or {}).items():
            candidates.append(ResultCandidate(
                member_id=cid,
                member_name=detail.get("member_name", ""),
                votes=detail.get("votes", 0),
                percentage=detail.get("percentage", 0),
                rank=detail.get("rank", 0),
            ))
        d.all_candidates = sorted(candidates, key=lambda c: (-c.votes, c.rank))
        return d


# ── Dashboard ────────────────────────────────────────────────

class ElectionStats(BaseModel):
    total_elections: int
    active_elections: int
    total_votes_cast: int
    average_turnout: float
    quorum_met_rate: float
    recent_elections: list[dict] = []
    voter_turnout: float = 0  # alias for frontend compat

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        d = super().model_validate(obj, **kwargs)
        d.voter_turnout = d.average_turnout
        return d
