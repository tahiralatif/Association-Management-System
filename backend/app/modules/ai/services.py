"""AI Engine services — business logic for predictions, anomaly detection, document generation, embeddings, and insights."""

import math
import statistics
import uuid
from datetime import datetime, timezone, timedelta
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.ai import crud
from app.modules.ai.schemas import (
    AnomalyResponse,
    ChurnPredictionResponse,
    DocumentGenerateResponse,
    InsightResponse,
    SearchResponseItem,
)


# ── Helpers ──────────────────────────────────────────────────

def _get_llm_config() -> dict:
    """Check if LLM API is configured."""
    from app.core.llm import is_available
    available = is_available()
    api_key = settings.GROQ_API_KEY or settings.LLM_API_KEY or ""
    model = settings.GROQ_MODEL or settings.LLM_MODEL or "llama-3.3-70b-versatile"
    return {
        "available": available,
        "api_key": bool(api_key),
        "model": model,
    }


def _z_score(value: float, mean: float, stdev: float) -> float:
    """Calculate z-score."""
    if stdev == 0:
        return 0.0
    return (value - mean) / stdev


def _iqr_bounds(values: list[float]) -> tuple[float, float]:
    """Calculate IQR bounds."""
    if len(values) < 4:
        return (min(values) if values else 0, max(values) if values else 0)
    sorted_v = sorted(values)
    n = len(sorted_v)
    q1 = sorted_v[n // 4]
    q3 = sorted_v[3 * n // 4]
    iqr = q3 - q1
    return (q1 - 1.5 * iqr, q3 + 1.5 * iqr)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Simple cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _tf_idf_vectorize(text: str, vocabulary: dict[str, int], idf: dict[str, float]) -> list[float]:
    """Simple TF-IDF vectorization."""
    tokens = text.lower().split()
    tf = Counter(tokens)
    total = len(tokens) or 1
    vector = [0.0] * len(vocabulary)
    for token, count in tf.items():
        if token in vocabulary:
            idx = vocabulary[token]
            vector[idx] = (count / total) * idf.get(token, 1.0)
    return vector


def _simple_tokenizer(text: str) -> list[str]:
    """Basic whitespace + punctuation tokenizer."""
    import re
    return [w for w in re.split(r'\W+', text.lower()) if len(w) > 2]


# ── Churn Predictor ──────────────────────────────────────────

class ChurnPredictor:
    """Rule-based churn risk prediction with optional ML enhancement."""

    @staticmethod
    async def predict_churn_risk(
        db: AsyncSession, tenant_id: str, member_id: str
    ) -> ChurnPredictionResponse:
        """
        Predict churn risk for a member using RFM (Recency, Frequency, Monetary) analysis.
        Falls back to rule-based scoring when ML model is not available.
        """
        from app.modules.members.models import MemberProfile, User
        from app.modules.finances.models import Invoice, Payment

        # Fetch member profile
        result = await db.execute(
            select(MemberProfile, User)
            .join(User, MemberProfile.user_id == User.id)
            .where(MemberProfile.id == member_id, MemberProfile.tenant_id == tenant_id)
        )
        row = result.first()
        if not row:
            return ChurnPredictionResponse(
                member_id=member_id,
                risk_score=0.5,
                risk_factors=["Member not found"],
                recommendation="Verify member exists in the system",
            )

        profile, user = row
        risk_factors = []
        risk_score = 0.0
        now = datetime.now(timezone.utc)

        # 1. Recency — last login
        if user.last_login_at:
            days_since_login = (now - user.last_login_at).days
            if days_since_login > 180:
                risk_score += 0.35
                risk_factors.append(f"No login for {days_since_login} days")
            elif days_since_login > 90:
                risk_score += 0.2
                risk_factors.append(f"Last login {days_since_login} days ago")
            elif days_since_login > 30:
                risk_score += 0.1
                risk_factors.append(f"Last login {days_since_login} days ago")
        else:
            risk_score += 0.3
            risk_factors.append("Never logged in")

        # 2. Payment history — overdue invoices
        invoice_result = await db.execute(
            select(Invoice).where(
                Invoice.member_id == member_id,
                Invoice.tenant_id == tenant_id,
            )
        )
        invoices = invoice_result.scalars().all()

        overdue_count = sum(1 for inv in invoices if str(inv.status) == "overdue")
        paid_count = sum(1 for inv in invoices if str(inv.status) == "paid")

        if overdue_count > 2:
            risk_score += 0.3
            risk_factors.append(f"{overdue_count} overdue invoices")
        elif overdue_count > 0:
            risk_score += 0.15
            risk_factors.append(f"{overdue_count} overdue invoice(s)")

        if paid_count == 0 and len(invoices) > 0:
            risk_score += 0.15
            risk_factors.append("No successful payments")

        # 3. Engagement score
        if profile.engagement_score < 0.2:
            risk_score += 0.2
            risk_factors.append(f"Low engagement score ({profile.engagement_score:.1f})")
        elif profile.engagement_score < 0.5:
            risk_score += 0.1
            risk_factors.append(f"Moderate engagement score ({profile.engagement_score:.1f})")

        # 4. Membership status
        if str(profile.status) == "lapsed":
            risk_score += 0.25
            risk_factors.append("Membership is lapsed")
        elif str(profile.status) == "suspended":
            risk_score += 0.35
            risk_factors.append("Membership is suspended")

        # 5. Auto-renew
        if not profile.auto_renew and profile.expires_at:
            days_to_expiry = (profile.expires_at - now).days
            if 0 < days_to_expiry <= 30:
                risk_score += 0.15
                risk_factors.append(f"Membership expires in {days_to_expiry} days (no auto-renew)")

        # Clamp score
        risk_score = min(1.0, max(0.0, risk_score))

        # Generate recommendation
        if risk_score >= 0.7:
            recommendation = "Immediate outreach recommended. Consider personalized retention offer or one-on-one meeting."
        elif risk_score >= 0.5:
            recommendation = "Moderate risk. Send targeted engagement campaign and check in within 2 weeks."
        elif risk_score >= 0.3:
            recommendation = "Low-moderate risk. Include in regular engagement communications."
        else:
            recommendation = "Low risk. Continue regular engagement activities."

        # Store prediction
        confidence = 0.75 if len(risk_factors) >= 3 else 0.55
        await crud.create_prediction(
            db, tenant_id, member_id, "member", "churn_risk",
            confidence=confidence,
            result={
                "risk_score": risk_score,
                "risk_factors": risk_factors,
                "recommendation": recommendation,
            },
        )

        return ChurnPredictionResponse(
            member_id=member_id,
            risk_score=round(risk_score, 4),
            risk_factors=risk_factors,
            recommendation=recommendation,
            confidence=confidence,
        )


# ── Anomaly Detector ─────────────────────────────────────────

class AnomalyDetector:
    """Statistical anomaly detection for financial transactions."""

    @staticmethod
    async def detect_financial_anomalies(
        db: AsyncSession, tenant_id: str, transactions: list[dict] | None = None
    ) -> list[AnomalyResponse]:
        """
        Detect anomalous transactions using z-score and IQR methods.
        If no transactions provided, fetch recent ones from the database.
        """
        if transactions is None:
            from app.modules.finances.models import Payment
            ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
            result = await db.execute(
                select(Payment).where(
                    Payment.tenant_id == tenant_id,
                    Payment.created_at >= ninety_days_ago,
                ).order_by(Payment.created_at.desc()).limit(500)
            )
            payments = result.scalars().all()
            transactions = [
                {
                    "id": p.id,
                    "amount": float(p.amount),
                    "member_id": p.member_id,
                    "payment_method": str(p.payment_method),
                    "created_at": p.created_at.isoformat(),
                }
                for p in payments
            ]

        if not transactions:
            return []

        anomalies = []
        amounts = [t.get("amount", 0) for t in transactions]

        if len(amounts) < 5:
            return []

        # Calculate statistics
        mean_amount = statistics.mean(amounts)
        stdev_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0
        iqr_low, iqr_high = _iqr_bounds(amounts)

        # Per-member analysis
        member_amounts: dict[str, list[float]] = {}
        for t in transactions:
            mid = t.get("member_id", "unknown")
            member_amounts.setdefault(mid, []).append(t.get("amount", 0))

        member_means = {}
        member_stdevs = {}
        for mid, amts in member_amounts.items():
            if len(amts) >= 3:
                member_means[mid] = statistics.mean(amts)
                member_stdevs[mid] = statistics.stdev(amts) if len(amts) > 1 else 0

        for t in transactions:
            amount = t.get("amount", 0)
            tid = t.get("id", "unknown")
            mid = t.get("member_id", "unknown")
            flags = []

            # Z-score check (global)
            z = _z_score(amount, mean_amount, stdev_amount)
            if abs(z) > 3:
                flags.append("extreme_amount")
            elif abs(z) > 2.5:
                flags.append("high_amount")

            # IQR check (global)
            if amount < iqr_low or amount > iqr_high:
                flags.append("outside_iqr")

            # Per-member deviation
            if mid in member_means:
                member_z = _z_score(amount, member_means[mid], member_stdevs[mid])
                if abs(member_z) > 2:
                    flags.append("deviates_from_member_pattern")

            # Large single transaction
            if amount > mean_amount * 5:
                flags.append("unusually_large")

            if flags:
                severity = "low"
                if len(flags) >= 3 or "extreme_amount" in flags:
                    severity = "critical"
                elif "high_amount" in flags or "unusually_large" in flags:
                    severity = "high"
                elif "outside_iqr" in flags:
                    severity = "medium"

                anomalies.append(AnomalyResponse(
                    transaction_id=tid,
                    anomaly_type=", ".join(flags),
                    severity=severity,
                    description=f"Transaction of ${amount:.2f} flagged: {', '.join(flags)}",
                    amount=amount,
                ))

        return anomalies


# ── Document Generator ───────────────────────────────────────

class DocumentGenerator:
    """Template-based document generation with optional LLM enhancement."""

    TEMPLATES = {
        "meeting_minutes": {
            "title": "Meeting Minutes",
            "template": """# {title}

**Date:** {date}
**Time:** {time}
**Location:** {location}
**Chair:** {chair}
**Secretary:** {secretary}

---

## Attendees
{attendees}

## Agenda
{agenda}

## Discussion
{discussion}

## Resolutions
{resolutions}

## Action Items
{action_items}

## Next Meeting
{next_meeting}

---
*Minutes prepared by {secretary}*
""",
            "required_fields": ["title", "date", "chair", "secretary"],
        },
        "bylaws_amendment": {
            "title": "Bylaws Amendment",
            "template": """# Amendment to the Bylaws

**Proposed by:** {proposer}
**Date:** {date}
**Article/Section:** {section}

---

## Current Text
{current_text}

## Proposed Amendment
{proposed_text}

## Rationale
{rationale}

## Fiscal Impact
{fiscal_impact}

---

**Vote Required:** {vote_required}
**Effective Date:** {effective_date}

*This amendment requires approval by {vote_required} of the membership.*
""",
            "required_fields": ["proposer", "date", "section", "current_text", "proposed_text"],
        },
        "resolution": {
            "title": "Board Resolution",
            "template": """# Resolution No. {resolution_number}

**Date:** {date}
**Sponsor:** {sponsor}

---

## BE IT RESOLVED:

{resolution_text}

## Background
{background}

## Financial Impact
{financial_impact}

## Implementation Plan
{implementation_plan}

---

**Motion by:** {moved_by}
**Seconded by:** {seconded_by}
**Vote:** {vote_result}

**Board Members Present:**
{board_members}

*Certified by: {certifier}, {certifier_title}*
""",
            "required_fields": ["resolution_number", "date", "resolution_text"],
        },
        "financial_summary": {
            "title": "Financial Summary Report",
            "template": """# Financial Summary Report

**Period:** {period}
**Prepared by:** {prepared_by}
**Date:** {date}

---

## Revenue Summary
| Category | Amount |
|----------|--------|
{revenue_table}

**Total Revenue:** {total_revenue}

## Expense Summary
| Category | Amount |
|----------|--------|
{expense_table}

**Total Expenses:** {total_expenses}

## Net Income
**{net_income}**

## Key Metrics
{key_metrics}

## Budget vs. Actual
{budget_comparison}

## Notes
{notes}

---
*Report generated on {date}*
""",
            "required_fields": ["period", "prepared_by"],
        },
    }

    @staticmethod
    async def generate_document(
        tenant_id: str, doc_type: str, context: dict | str
    ) -> DocumentGenerateResponse:
        """Generate a document from a template with provided context."""
        template_info = DocumentGenerator.TEMPLATES.get(doc_type)
        if not template_info:
            return DocumentGenerateResponse(
                content=f"# Unknown Document Type\n\nRequested type '{doc_type}' is not supported.",
                summary=f"Unsupported document type: {doc_type}",
                key_points=[],
                confidence=0.0,
            )

        # Normalize context to dict
        if isinstance(context, str):
            context = {"description": context}

        # Fill template with defaults for missing fields
        filled_context = {}
        for key, value in context.items():
            filled_context[key] = value

        # Add defaults
        defaults = {
            "title": "Untitled",
            "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
            "time": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "location": "TBD",
            "period": "Q4 2024",
            "prepared_by": "Staff",
        }
        for key, default in defaults.items():
            if key not in filled_context:
                filled_context[key] = default

        # Fill simple fields
        content = template_info["template"]
        key_points = []

        # Convert list values to strings for template rendering
        for k, v in filled_context.items():
            if isinstance(v, list):
                filled_context[k] = ", ".join(str(item) for item in v)

        try:
            content = content.format(**filled_context)
        except KeyError:
            # Fill remaining with placeholders
            import re
            content = re.sub(r'\{(\w+)\}', lambda m: str(filled_context.get(m.group(1), f'[{m.group(1)}]')), content)

        # Extract key points
        required = template_info.get("required_fields", [])
        for field in required:
            if field in filled_context:
                key_points.append(f"{field.replace('_', ' ').title()}: {filled_context[field]}")

        if not key_points:
            key_points = [f"Document type: {template_info['title']}"]

        # ── LLM writing enhancement ──
        llm = _get_llm_config()
        if llm["available"]:
            from app.core.llm import is_available, complete
            if is_available():
                polished = complete(
                    f"Rewrite this {template_info['title'].lower()} to be professional, "
                    f"clear, and well-structured. Keep all factual content exactly as-is. "
                    f"Do not add information that isn't present. Output only the rewritten document."
                    f"\n\n---\n\n{content}",
                    system="You are a professional document editor for an association. "
                            "Polish the writing for clarity and tone. Never invent facts.",
                    temperature=0.3,
                    max_tokens=4096,
                )
                if polished and len(polished) > 100:
                    content = polished
                    summary = f"Generated {template_info['title']} and polished with AI."
                    confidence = 0.9

        return DocumentGenerateResponse(
            content=content,
            summary=summary,
            key_points=key_points,
            confidence=confidence,
        )


# ── Embedding Service ────────────────────────────────────────

class EmbeddingService:
    """Create and search embeddings with local TF-IDF fallback."""

    def __init__(self):
        self._vocabulary: dict[str, int] = {}
        self._idf: dict[str, float] = {}
        self._corpus: list[str] = []

    def _build_vocabulary(self, texts: list[str]):
        """Build TF-IDF vocabulary from corpus."""
        doc_freq: dict[str, int] = Counter()
        all_tokens: set[str] = set()

        for text in texts:
            tokens = set(_simple_tokenizer(text))
            for t in tokens:
                doc_freq[t] = doc_freq.get(t, 0) + 1
            all_tokens.update(tokens)

        n_docs = len(texts) or 1
        self._vocabulary = {t: i for i, t in enumerate(sorted(all_tokens))}
        self._idf = {
            t: math.log((n_docs + 1) / (freq + 1)) + 1
            for t, freq in doc_freq.items()
        }

    async def create_embedding(
        self, db: AsyncSession, tenant_id: str,
        content_id: str, content_type: str, text: str,
        metadata: dict | None = None,
    ) -> dict:
        """Create an embedding for content. Uses TF-IDF vectorization."""
        # Remove old embeddings for this content
        await crud.delete_embeddings_for_content(db, tenant_id, content_id, content_type)

        # Chunk text into paragraphs
        chunks = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not chunks:
            chunks = [text]

        created = []
        for chunk in chunks[:20]:  # Limit to 20 chunks
            # Use TF-IDF as embedding (1536 dimensions with hashing)
            embedding = self._hash_embed(chunk)

            emb = await crud.create_embedding(
                db, tenant_id, content_id, content_type, chunk,
                embedding, metadata,
            )
            created.append(emb)

        return {
            "id": created[0].id if created else None,
            "content_id": content_id,
            "content_type": content_type,
            "chunks_created": len(created),
        }

    async def search_similar(
        self, db: AsyncSession, tenant_id: str, query: str,
        content_types: list[str] | None = None, limit: int = 10,
    ) -> list[SearchResponseItem]:
        """Search for similar content using cosine similarity."""
        query_embedding = self._hash_embed(query)

        results = await crud.search_embeddings(
            db, tenant_id, query_embedding, content_types, limit
        )

        return [
            SearchResponseItem(
                content_id=r["content_id"],
                content_type=r["content_type"],
                text=r["text"],
                score=r["score"],
                metadata=r.get("metadata"),
            )
            for r in results
        ]

    @staticmethod
    def _hash_embed(text: str) -> list[float]:
        """
        Deterministic hash-based embedding (1536 dimensions).
        Not semantic — use as fallback when no LLM API is available.
        """
        import hashlib
        tokens = _simple_tokenizer(text)
        vector = [0.0] * 1536

        for token in tokens:
            h = hashlib.sha256(token.encode()).hexdigest()
            for i in range(0, min(8, len(h)), 2):
                idx = int(h[i:i+2], 16) % 1536
                direction = 1 if (int(h[i], 16) % 2 == 0) else -1
                vector[idx] += direction * 0.1

        # Normalize
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]

        return vector


# Singleton
embedding_service = EmbeddingService()


# ── AI Insights ──────────────────────────────────────────────

class AIInsights:
    """Cross-module insight generation."""

    @staticmethod
    async def generate_insights(db: AsyncSession, tenant_id: str) -> list[InsightResponse]:
        """Generate insights from cross-module data analysis."""
        insights = []

        # 1. Member growth trend
        member_insight = await AIInsights._member_growth_insight(db, tenant_id)
        if member_insight:
            insights.append(member_insight)

        # 2. Revenue trend
        revenue_insight = await AIInsights._revenue_insight(db, tenant_id)
        if revenue_insight:
            insights.append(revenue_insight)

        # 3. Engagement insight
        engagement_insight = await AIInsights._engagement_insight(db, tenant_id)
        if engagement_insight:
            insights.append(engagement_insight)

        # 4. Churn risk summary
        churn_insight = await AIInsights._churn_risk_insight(db, tenant_id)
        if churn_insight:
            insights.append(churn_insight)

        return insights

    @staticmethod
    async def _member_growth_insight(db: AsyncSession, tenant_id: str) -> InsightResponse | None:
        """Analyze member growth trends."""
        from app.modules.members.models import MemberProfile

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # Members joined in last 30 days
        recent = await db.execute(
            select(func.count())
            .select_from(MemberProfile)
            .where(MemberProfile.tenant_id == tenant_id, MemberProfile.joined_at >= thirty_days_ago)
        )
        recent_count = recent.scalar() or 0

        # Members joined in 30-60 days ago
        prev = await db.execute(
            select(func.count())
            .select_from(MemberProfile)
            .where(
                MemberProfile.tenant_id == tenant_id,
                MemberProfile.joined_at >= sixty_days_ago,
                MemberProfile.joined_at < thirty_days_ago,
            )
        )
        prev_count = prev.scalar() or 0

        if prev_count == 0 and recent_count == 0:
            return None

        growth_rate = ((recent_count - prev_count) / max(prev_count, 1)) * 100

        if growth_rate > 20:
            severity = "info"
            description = f"Strong member growth: {recent_count} new members in the last 30 days ({growth_rate:+.0f}% vs previous period)."
        elif growth_rate < -10:
            severity = "warning"
            description = f"Member growth declined: {recent_count} new members in the last 30 days ({growth_rate:+.0f}% vs previous period)."
        else:
            severity = "info"
            description = f"Stable member growth: {recent_count} new members in the last 30 days ({growth_rate:+.0f}% vs previous period)."

        return InsightResponse(
            insight_type="trend",
            title="Member Growth Trend",
            description=description,
            severity=severity,
            data={"recent_count": recent_count, "previous_count": prev_count, "growth_rate": round(growth_rate, 1)},
            actionable=growth_rate < -10,
            action_url="/api/v1/members" if growth_rate < -10 else None,
        )

    @staticmethod
    async def _revenue_insight(db: AsyncSession, tenant_id: str) -> InsightResponse | None:
        """Analyze revenue trends."""
        from app.modules.finances.models import Payment

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        recent_result = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .where(
                Payment.tenant_id == tenant_id,
                Payment.created_at >= thirty_days_ago,
                Payment.status == "completed",
            )
        )
        recent_revenue = float(recent_result.scalar() or 0)

        prev_result = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .where(
                Payment.tenant_id == tenant_id,
                Payment.created_at >= sixty_days_ago,
                Payment.created_at < thirty_days_ago,
                Payment.status == "completed",
            )
        )
        prev_revenue = float(prev_result.scalar() or 0)

        if recent_revenue == 0 and prev_revenue == 0:
            return None

        change_pct = ((recent_revenue - prev_revenue) / max(prev_revenue, 1)) * 100

        if change_pct < -20:
            severity = "warning"
            description = f"Revenue declined by {abs(change_pct):.0f}% (${recent_revenue:,.0f} vs ${prev_revenue:,.0f} previous period)."
        elif change_pct > 20:
            severity = "info"
            description = f"Revenue increased by {change_pct:.0f}% (${recent_revenue:,.0f} vs ${prev_revenue:,.0f} previous period)."
        else:
            severity = "info"
            description = f"Revenue stable at ${recent_revenue:,.0f} ({change_pct:+.0f}% vs previous period)."

        return InsightResponse(
            insight_type="trend",
            title="Revenue Trend",
            description=description,
            severity=severity,
            data={"recent_revenue": recent_revenue, "previous_revenue": prev_revenue, "change_pct": round(change_pct, 1)},
            actionable=change_pct < -20,
            action_url="/api/v1/finances/dashboard" if change_pct < -20 else None,
        )

    @staticmethod
    async def _engagement_insight(db: AsyncSession, tenant_id: str) -> InsightResponse | None:
        """Analyze member engagement patterns."""
        from app.modules.members.models import MemberProfile

        avg_result = await db.execute(
            select(func.avg(MemberProfile.engagement_score))
            .where(MemberProfile.tenant_id == tenant_id)
        )
        avg_engagement = float(avg_result.scalar() or 0)

        low_count_result = await db.execute(
            select(func.count())
            .select_from(MemberProfile)
            .where(MemberProfile.tenant_id == tenant_id, MemberProfile.engagement_score < 0.3)
        )
        low_count = low_count_result.scalar() or 0

        total_result = await db.execute(
            select(func.count())
            .select_from(MemberProfile)
            .where(MemberProfile.tenant_id == tenant_id)
        )
        total = total_result.scalar() or 1

        low_pct = (low_count / total) * 100

        if low_pct > 40:
            severity = "warning"
            description = f"{low_pct:.0f}% of members have low engagement (score < 0.3). Average engagement: {avg_engagement:.2f}."
        else:
            severity = "info"
            description = f"Member engagement is healthy. Average score: {avg_engagement:.2f}. {low_pct:.0f}% of members have low engagement."

        return InsightResponse(
            insight_type="recommendation",
            title="Member Engagement Analysis",
            description=description,
            severity=severity,
            data={
                "avg_engagement": round(avg_engagement, 3),
                "low_engagement_count": low_count,
                "low_engagement_pct": round(low_pct, 1),
                "total_members": total,
            },
            actionable=low_pct > 40,
            action_url="/api/v1/members" if low_pct > 40 else None,
        )

    @staticmethod
    async def _churn_risk_insight(db: AsyncSession, tenant_id: str) -> InsightResponse | None:
        """Summarize churn risk across members."""
        from app.modules.members.models import MemberProfile

        high_risk_result = await db.execute(
            select(func.count())
            .select_from(MemberProfile)
            .where(MemberProfile.tenant_id == tenant_id, MemberProfile.churn_risk > 0.7)
        )
        high_risk = high_risk_result.scalar() or 0

        medium_risk_result = await db.execute(
            select(func.count())
            .select_from(MemberProfile)
            .where(
                MemberProfile.tenant_id == tenant_id,
                MemberProfile.churn_risk > 0.4,
                MemberProfile.churn_risk <= 0.7,
            )
        )
        medium_risk = medium_risk_result.scalar() or 0

        if high_risk == 0 and medium_risk == 0:
            return None

        severity = "critical" if high_risk > 5 else "warning" if high_risk > 0 else "info"
        description = f"{high_risk} members at high churn risk (>0.7), {medium_risk} at moderate risk (0.4-0.7)."

        return InsightResponse(
            insight_type="prediction",
            title="Churn Risk Summary",
            description=description,
            severity=severity,
            data={"high_risk_count": high_risk, "medium_risk_count": medium_risk},
            actionable=high_risk > 0,
            action_url="/api/v1/members" if high_risk > 0 else None,
        )
