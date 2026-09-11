"""ML Churn Model — train/predict with scikit-learn.

Features:
- days_since_last_login
- total_events_attended
- overdue_invoice_count
- paid_invoice_ratio
- membership_tenure_days
- engagement_score
- total_payments
- avg_payment_amount
- has_auto_renew
- days_to_expiry

Uses GradientBoostingClassifier for churn prediction.
Model saved with joblib to backend/app/ai/ml/saved_models/
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

SAVED_MODELS_DIR = Path(__file__).parent / "saved_models"
SAVED_MODELS_DIR.mkdir(exist_ok=True)

FEATURE_NAMES = [
    "days_since_last_login",
    "total_events_attended",
    "overdue_invoice_count",
    "paid_invoice_ratio",
    "membership_tenure_days",
    "engagement_score",
    "total_payments",
    "avg_payment_amount",
    "has_auto_renew",
    "days_to_expiry",
]


def _model_path(tenant_id: str) -> Path:
    return SAVED_MODELS_DIR / f"churn_model_{tenant_id}.joblib"


def _features_path(tenant_id: str) -> Path:
    return SAVED_MODELS_DIR / f"churn_features_{tenant_id}.joblib"


async def extract_features(db, tenant_id: str) -> tuple[list[list[float]], list[str], list[int]]:
    """Extract features for all members of a tenant.
    
    Returns:
        (X: feature matrix, member_ids: list of member IDs, labels: 0=active, 1=churned)
    """
    from sqlalchemy import select, func
    from app.modules.members.models import MemberProfile, User
    from app.modules.finances.models import Invoice, Payment
    from app.modules.events.models import EventRegistration

    now = datetime.now(timezone.utc)

    # Get all member profiles with users
    result = await db.execute(
        select(MemberProfile, User)
        .join(User, MemberProfile.user_id == User.id)
        .where(MemberProfile.tenant_id == tenant_id, User.is_active == True)
    )
    rows = result.all()

    X = []
    member_ids = []
    labels = []

    for profile, user in rows:
        # days_since_last_login
        if user.last_login_at:
            days_since_login = (now - user.last_login_at).days
        else:
            days_since_login = 999  # never logged in

        # total_events_attended
        evt_result = await db.execute(
            select(func.count())
            .select_from(EventRegistration)
            .where(
                EventRegistration.member_id == profile.id,
                EventRegistration.status.in_(["confirmed", "checked_in"]),
            )
        )
        total_events = evt_result.scalar() or 0

        # overdue_invoice_count
        overdue_result = await db.execute(
            select(func.count())
            .select_from(Invoice)
            .where(
                Invoice.member_id == profile.id,
                Invoice.tenant_id == tenant_id,
                Invoice.status == "overdue",
            )
        )
        overdue_count = overdue_result.scalar() or 0

        # paid_invoice_ratio
        paid_result = await db.execute(
            select(func.count())
            .select_from(Invoice)
            .where(
                Invoice.member_id == profile.id,
                Invoice.tenant_id == tenant_id,
                Invoice.status == "paid",
            )
        )
        paid_count = paid_result.scalar() or 0

        total_invoices_result = await db.execute(
            select(func.count())
            .select_from(Invoice)
            .where(Invoice.member_id == profile.id, Invoice.tenant_id == tenant_id)
        )
        total_invoices = total_invoices_result.scalar() or 0
        paid_ratio = paid_count / max(total_invoices, 1)

        # membership_tenure_days
        tenure = (now - profile.joined_at).days if profile.joined_at else 0

        # total_payments & avg_payment_amount
        payment_result = await db.execute(
            select(
                func.count(Payment.id),
                func.coalesce(func.avg(Payment.amount), 0),
            )
            .where(Payment.member_id == profile.id, Payment.tenant_id == tenant_id)
        )
        payment_row = payment_result.first()
        total_payments = payment_row[0] or 0
        avg_payment = float(payment_row[1] or 0)

        # has_auto_renew
        has_auto_renew = 1 if profile.auto_renew else 0

        # days_to_expiry
        if profile.expires_at:
            days_to_expiry = max(0, (profile.expires_at - now).days)
        else:
            days_to_expiry = 365  # default

        features = [
            float(days_since_login),
            float(total_events),
            float(overdue_count),
            float(paid_ratio),
            float(tenure),
            float(profile.engagement_score),
            float(total_payments),
            float(avg_payment),
            float(has_auto_renew),
            float(days_to_expiry),
        ]

        # Label: churned if lapsed/suspended or engagement < 0.2 and no login in 90+ days
        status_str = str(profile.status.value) if hasattr(profile.status, 'value') else str(profile.status)
        is_churned = (
            1 if status_str in ("lapsed", "suspended")
            else 1 if profile.engagement_score < 0.2 and days_since_login > 90
            else 0
        )

        X.append(features)
        member_ids.append(profile.id)
        labels.append(is_churned)

    return X, member_ids, labels


async def train_model(db, tenant_id: str) -> dict:
    """Train a GradientBoosting churn model for a tenant.
    
    Returns training metrics dict.
    """
    import joblib
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.model_selection import cross_val_score
    from sklearn.preprocessing import StandardScaler

    X, member_ids, labels = await extract_features(db, tenant_id)

    if len(X) < 10:
        return {"status": "insufficient_data", "samples": len(X), "min_required": 10}

    X_arr = np.array(X, dtype=np.float64)
    y_arr = np.array(labels, dtype=np.int32)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_arr)

    # Train model
    model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        min_samples_split=5,
        min_samples_leaf=3,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_scaled, y_arr)

    # Cross-validation score
    n_cv = min(5, len(X) // 3) if len(X) >= 15 else 2
    cv_scores = cross_val_score(model, X_scaled, y_arr, cv=n_cv, scoring="accuracy")

    # Feature importance
    importances = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))

    # Save model and scaler
    model_data = {
        "model": model,
        "scaler": scaler,
        "feature_names": FEATURE_NAMES,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "tenant_id": tenant_id,
        "n_samples": len(X),
        "n_features": len(FEATURE_NAMES),
    }
    joblib.dump(model_data, _model_path(tenant_id))

    # Also save features for reference
    features_data = {
        "feature_names": FEATURE_NAMES,
        "member_ids": member_ids,
        "n_samples": len(X),
    }
    joblib.dump(features_data, _features_path(tenant_id))

    metrics = {
        "status": "trained",
        "algorithm": "GradientBoostingClassifier",
        "n_samples": len(X),
        "n_features": len(FEATURE_NAMES),
        "cv_accuracy_mean": float(cv_scores.mean()),
        "cv_accuracy_std": float(cv_scores.std()),
        "feature_importances": importances,
        "trained_at": model_data["trained_at"],
        "churn_rate": float(sum(labels) / len(labels)),
    }

    logger.info(
        "Churn model trained for %s: %d samples, accuracy=%.3f±%.3f",
        tenant_id, len(X), cv_scores.mean(), cv_scores.std(),
    )

    return metrics


async def predict_churn_risk_ml(db, tenant_id: str, member_id: str) -> dict:
    """Predict churn risk for a single member using the trained ML model.
    
    Falls back to rule-based if no model exists.
    """
    import joblib

    model_path = _model_path(tenant_id)
    if not model_path.exists():
        # Fallback to rule-based
        from app.modules.ai.services import ChurnPredictor
        result = await ChurnPredictor.predict_churn_risk(db, tenant_id, member_id)
        return {
            "method": "rule_based",
            "risk_score": result.risk_score,
            "risk_factors": result.risk_factors,
            "recommendation": result.recommendation,
            "confidence": result.confidence,
        }

    model_data = joblib.load(model_path)
    model = model_data["model"]
    scaler = model_data["scaler"]

    # Extract features for this member
    X, member_ids, _ = await extract_features(db, tenant_id)
    
    if member_id not in member_ids:
        return {"method": "not_found", "risk_score": 0.5, "risk_factors": ["Member not found"], "recommendation": "Verify member exists", "confidence": 0.3}

    idx = member_ids.index(member_id)
    X_member = np.array([X[idx]], dtype=np.float64)
    X_scaled = scaler.transform(X_member)

    # Predict probability
    proba = model.predict_proba(X_scaled)[0]
    churn_probability = float(proba[1])  # probability of class 1 (churned)

    # Risk factors based on feature values
    feature_values = dict(zip(FEATURE_NAMES, X[idx]))
    risk_factors = []

    if feature_values["days_since_last_login"] > 90:
        risk_factors.append(f"No login for {int(feature_values['days_since_last_login'])} days")
    if feature_values["overdue_invoice_count"] > 1:
        risk_factors.append(f"{int(feature_values['overdue_invoice_count'])} overdue invoices")
    if feature_values["paid_invoice_ratio"] < 0.5:
        risk_factors.append(f"Low payment ratio ({feature_values['paid_invoice_ratio']:.0%})")
    if feature_values["engagement_score"] < 0.3:
        risk_factors.append(f"Low engagement ({feature_values['engagement_score']:.2f})")
    if feature_values["days_to_expiry"] < 30 and feature_values["has_auto_renew"] == 0:
        risk_factors.append(f"Expires in {int(feature_values['days_to_expiry'])} days, no auto-renew")
    if feature_values["membership_tenure_days"] < 90:
        risk_factors.append("New member (< 90 days)")

    if not risk_factors:
        risk_factors.append("No significant risk factors detected")

    # Recommendation
    if churn_probability >= 0.7:
        recommendation = "Immediate outreach recommended. Consider personalized retention offer or one-on-one meeting."
    elif churn_probability >= 0.5:
        recommendation = "Moderate risk. Send targeted engagement campaign and check in within 2 weeks."
    elif churn_probability >= 0.3:
        recommendation = "Low-moderate risk. Include in regular engagement communications."
    else:
        recommendation = "Low risk. Continue regular engagement activities."

    return {
        "method": "ml_gradient_boosting",
        "risk_score": round(churn_probability, 4),
        "risk_factors": risk_factors,
        "recommendation": recommendation,
        "confidence": 0.85,
        "model_version": model_data.get("trained_at", "unknown"),
    }


async def batch_predict_all(db, tenant_id: str) -> list[dict]:
    """Predict churn risk for all members in a tenant.
    
    Returns list of {member_id, risk_score, risk_level}.
    """
    import joblib

    model_path = _model_path(tenant_id)
    if not model_path.exists():
        return []

    model_data = joblib.load(model_path)
    model = model_data["model"]
    scaler = model_data["scaler"]

    X, member_ids, _ = await extract_features(db, tenant_id)
    if not X:
        return []

    X_arr = np.array(X, dtype=np.float64)
    X_scaled = scaler.transform(X_arr)
    probas = model.predict_proba(X_scaled)[:, 1]

    results = []
    for i, member_id in enumerate(member_ids):
        score = float(probas[i])
        if score >= 0.7:
            level = "critical"
        elif score >= 0.5:
            level = "high"
        elif score >= 0.3:
            level = "medium"
        else:
            level = "low"

        results.append({
            "member_id": member_id,
            "risk_score": round(score, 4),
            "risk_level": level,
        })

    return results
