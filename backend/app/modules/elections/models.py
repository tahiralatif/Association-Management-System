"""Elections models — board elections, nominations, voting."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Integer, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ElectionStatus(str, enum.Enum):
    DRAFT = "draft"
    NOMINATIONS_OPEN = "nominations_open"
    VOTING = "voting"
    CLOSED = "closed"
    RESULTS_PUBLISHED = "results_published"


class NominationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"


class VoteMethod(str, enum.Enum):
    ONLINE = "online"
    MAIL = "mail"
    IN_PERSON = "in_person"


# ── Election ─────────────────────────────────────────────────

class Election(Base):
    __tablename__ = "elections"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    election_type: Mapped[str] = mapped_column(String(50), default="board")  # board, committee, officer, referendum
    status: Mapped[ElectionStatus] = mapped_column(Enum(ElectionStatus), default=ElectionStatus.DRAFT)

    # Schedule
    nominations_open: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    nominations_close: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    voting_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    voting_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Rules
    seats_available: Mapped[int] = mapped_column(Integer, default=1)
    max_candidates_per_seat: Mapped[int | None] = mapped_column(Integer)
    min_votes_required: Mapped[int | None] = mapped_column(Integer)
    quorum_percentage: Mapped[int] = mapped_column(Integer, default=33)  # % of members needed for quorum
    require_unanimous: Mapped[bool] = mapped_column(Boolean, default=False)

    # Voting config
    vote_method: Mapped[VoteMethod] = mapped_column(Enum(VoteMethod), default=VoteMethod.ONLINE)
    allow_abstain: Mapped[bool] = mapped_column(Boolean, default=True)
    secret_ballot: Mapped[bool] = mapped_column(Boolean, default=True)
    multiple_rounds: Mapped[bool] = mapped_column(Boolean, default=False)
    ranked_choice: Mapped[bool] = mapped_column(Boolean, default=False)

    # Results
    total_eligible_voters: Mapped[int] = mapped_column(Integer, default=0)
    total_votes_cast: Mapped[int] = mapped_column(Integer, default=0)
    quorum_met: Mapped[bool] = mapped_column(Boolean, default=False)
    results_summary: Mapped[dict | None] = mapped_column(JSON)

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    positions: Mapped[list["ElectionPosition"]] = relationship(back_populates="election")
    nominations: Mapped[list["Nomination"]] = relationship(back_populates="election")
    ballots: Mapped[list["Ballot"]] = relationship(back_populates="election")


# ── Position ─────────────────────────────────────────────────

class ElectionPosition(Base):
    """Positions/roles being voted on within an election."""
    __tablename__ = "election_positions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("elections.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    seats: Mapped[int] = mapped_column(Integer, default=1)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    election: Mapped["Election"] = relationship(back_populates="positions")


# ── Nomination ───────────────────────────────────────────────

class Nomination(Base):
    """Candidate nominations for a position."""
    __tablename__ = "nominations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("elections.id"), index=True)
    position_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("election_positions.id"))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    status: Mapped[NominationStatus] = mapped_column(Enum(NominationStatus), default=NominationStatus.PENDING)
    statement: Mapped[str | None] = mapped_column(Text)
    qualifications: Mapped[str | None] = mapped_column(Text)
    endorsed_by: Mapped[list | None] = mapped_column(JSON, default=[])

    nominated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationship
    election: Mapped["Election"] = relationship(back_populates="nominations")
    position: Mapped["ElectionPosition"] = relationship()
    member = relationship("MemberProfile", primaryjoin="Nomination.member_id == MemberProfile.id", foreign_keys="Nomination.member_id")


# ── Ballot ───────────────────────────────────────────────────

class Ballot(Base):
    """Individual votes cast by members."""
    __tablename__ = "ballots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("elections.id"), index=True)
    voter_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    # Ranked choice support: {"position_id": [candidate_id_rank1, candidate_id_rank2, ...]}
    # Simple support: {"position_id": [candidate_id]}
    votes: Mapped[dict] = mapped_column(JSON)
    abstentions: Mapped[list | None] = mapped_column(JSON, default=[])

    # Verification (for audit without breaking secret ballot)
    verification_code: Mapped[str | None] = mapped_column(String(100))
    ip_address: Mapped[str | None] = mapped_column(String(45))

    cast_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    election: Mapped["Election"] = relationship(back_populates="ballots")


# ── Election Result ──────────────────────────────────────────

class ElectionResult(Base):
    """Final results per position."""
    __tablename__ = "election_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("elections.id"), index=True)
    position_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("election_positions.id"))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    # Results
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    results_detail: Mapped[dict] = mapped_column(JSON)  # {candidate_id: {votes, percentage, rank}}
    winners: Mapped[list] = mapped_column(JSON, default=[])  # [candidate_id, ...]
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    position: Mapped["ElectionPosition"] = relationship()
