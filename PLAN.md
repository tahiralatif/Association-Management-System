# 🏛️ AssocHub — Gap Fix Execution Plan

> **Goal:** Take AssocHub from 44% feature-complete to production-ready.  
> **Method:** One task at a time, in order. Each task gets built, tested, committed, deployed.  
> **Started:** 2026-07-25

---

## Status Legend

- ⬜ Not started
- 🔄 In progress
- ✅ Done
- ❌ Blocked

---

## Phase 1: Foundation Hardening 🔒
*Make what exists secure, deployable, and maintainable.*

### Task 1.1 — RBAC Enforcement
**Status:** ✅  
**Done:** 2026-07-25 | **Commit:** e23ee9c  
**What:** 46 granular permissions across 11 modules. Role hierarchy: super_admin (46), tenant_admin (41), staff (30), member (8). PermissionChecker dependency, User model custom_permissions, JWT-embedded permissions, frontend PermissionGate + usePermissions hook + sidebar filtering. Verified with 3 role types.

### Task 1.2 — Alembic Migrations
**Status:** ⬜  
**What:** Generate proper migration scripts for all 60 tables. Currently tables exist but have no version-controlled schema history.  
**Steps:**
- Add `alembic.ini` + `alembic/` config if missing
- Run `alembic revision --autogenerate -m "initial schema"`
- Review generated migration (should be empty since tables exist)
- Create seed migration for demo data
- Add migration check to startup (warn if not up to date)  
**Validation:** `alembic upgrade head` on clean DB reproduces full schema.  
**Effort:** ~1-2 hours

### Task 1.3 — Test Suite Setup
**Status:** ⬜  
**What:** Add pytest + httpx async test infrastructure. Write tests for auth and one module as proof of concept.  
**Steps:**
- Add `pytest`, `pytest-asyncio`, `httpx` to dev dependencies
- Create `backend/tests/conftest.py` — test DB fixtures, auth fixtures, client fixture
- Create `backend/tests/test_auth.py` — register, login, verify, refresh, protected endpoint
- Create `backend/tests/test_members.py` — CRUD + search + pagination + bulk ops
- Create `backend/tests/test_health.py` — health endpoints  
**Validation:** `pytest -v` passes. CI-ready.  
**Effort:** ~4-6 hours

### Task 1.4 — Auto-Renewal & Expiry Scheduler
**Status:** ⬜  
**What:** Members silently lapse with no warning. Add Celery beat tasks to process renewals and send reminders.  
**Backend changes:**
- Create `backend/app/tasks/membership.py`:
  - `check_expiring_memberships()` — runs daily, sends 30/7/1 day reminder emails
  - `process_auto_renewals()` — runs daily, charges stored payment methods via Stripe
  - `mark_lapsed_memberships()` — runs daily, changes expired members to `lapsed`
- Add to Celery beat schedule in `config.py`
- Wire up email templates for reminders  
**Validation:** Seed test members with expiring dates. Verify emails trigger and status changes.  
**Effort:** ~3-4 hours

---

## Phase 2: Member Experience 👥
*Members are the product. Let them self-serve.*

### Task 2.1 — Member Self-Service Portal
**Status:** ⬜  
**What:** Create a member-facing dashboard where members can manage their own stuff (currently admin-only).  
**Frontend changes:**
- New route: `frontend/src/app/(member)/layout.tsx` — simpler layout, no admin sidebar
- `frontend/src/app/(member)/profile/page.tsx` — view/edit profile, avatar upload, change password
- `frontend/src/app/(member)/invoices/page.tsx` — view invoices, pay online, download PDF
- `frontend/src/app/(member)/events/page.tsx` — upcoming events, register, cancel, history
- `frontend/src/app/(member)/documents/page.tsx` — shared documents
- `frontend/src/app/(member)/groups/page.tsx` — my groups/committees  
**Backend changes:**
- `backend/app/modules/members/router.py` — add `/me` endpoints (GET /me, PUT /me, etc.)
- Member can only see/edit their own data (enforced server-side)  
**Validation:** Login as demo member → see dashboard, edit profile, view invoices.  
**Effort:** ~1-2 days

### Task 2.2 — File Upload (Documents Module)
**Status:** ✅  
**Done:** 2026-07-27 | **Commit:** e23ee9c  
**What:** Documents module metadata-only. Added actual file storage.

### Task 2.3 — Invoice PDF Generation
**Status:** ✅  
**Done:** 2026-07-27 | **What:** PDF invoice generation with WeasyPrint + Jinja2 templates.  
**Backend:** `backend/app/core/pdf.py` (generate_invoice_pdf, generate_receipt_pdf), `backend/templates/pdf/invoice.html` + `receipt.html`. Admin PDF: `GET /api/v1/finances/invoices/{id}/pdf`. Member PDF: `GET /api/v1/finances/my/invoices/{id}/pdf`.  
**Frontend:** Download PDF button on invoice rows in finances page.  
**Validation:** Created test invoice → downloaded PDF → verified 13KB+ valid PDF with line items, totals, dates.  
**Effort:** ~3 hours

---

## Phase 3: Financial Completeness 💰
*Revenue features make an AMS commercially viable.*

### Task 3.1 — Discount/Promo Codes
**Status:** ⬜  
**What:** Events and memberships need discount codes.  
**Backend changes:**
- New model: `DiscountCode` (code, type: percentage/fixed, value, max_uses, valid_from, valid_to, applicable_to)
- CRUD endpoints for discount codes
- Apply discount in registration/invoice creation endpoints  
**Frontend changes:**
- Discount code management page in admin
- Promo code input field on event registration and membership purchase  
**Validation:** Create 10% off code → register for event with code → verify discount applied.  
**Effort:** ~1 day

### Task 3.2 — Payment Receipts
**Status:** ⬜  
**What:** Auto-send PDF receipts after payment.  
**Backend changes:**
- Create `backend/templates/pdf/receipt.html` — receipt template
- Add receipt generation to payment webhook handler (Stripe)
- Send receipt via email automatically  
**Validation:** Complete a Stripe payment → receive receipt email with PDF attached.  
**Effort:** ~2-3 hours

### Task 3.3 — Refund Processing
**Status:** ⬜  
**What:** `PaymentStatus.refunded` exists but no actual Stripe refund call.  
**Backend changes:**
- Add `POST /api/v1/finances/payments/{id}/refund` endpoint
- Call `stripe.Refund.create()` with payment_intent ID
- Update payment status + generate credit note  
**Frontend changes:**
- Add "Refund" button on payment detail (admin only)  
**Validation:** Process a refund → verify Stripe refund created → payment status updated.  
**Effort:** ~2-3 hours

### Task 3.4 — Financial Reports (P&L)
**Status:** ⬜  
**What:** No actual financial reporting. Need revenue, expenses, net income views.  
**Backend changes:**
- Add report endpoints: revenue summary, expense summary, P&L, cash flow
- Add date range filtering
- Support CSV + PDF export  
**Frontend changes:**
- Enhance analytics page with financial report widgets (Recharts)
- Date range picker
- Export buttons  
**Validation:** Filter by Q1 2026 → see revenue vs expenses → export as PDF.  
**Effort:** ~1 day

---

## Phase 4: Communications Upgrade 📧
*Move from "we can send emails" to "smart communication platform."*

### Task 4.1 — Email Open/Click Tracking
**Status:** ⬜  
**What:** No idea if anyone opens or clicks campaign emails.  
**Backend changes:**
- Add tracking pixel (1x1 image) to outgoing emails
- Add click-through URL wrapping (redirect → track → redirect)
- Store events in `email_tracking_events` table
- Add engagement score to member profile  
**Frontend changes:**
- Show open rate / click rate per campaign
- Show per-recipient engagement data  
**Validation:** Send campaign → open email → click link → see stats in dashboard.  
**Effort:** ~1 day

### Task 4.2 — Unsubscribe Management
**Status:** ⬜  
**What:** No opt-out handling. Legally required (CAN-SPAM, GDPR).  
**Backend changes:**
- Add `unsubscribe_token` field to email sending logs
- Add `GET /api/v1/unsubscribe/{token}` endpoint — one-click unsubscribe
- Add `Preferences` model — member email preferences per category
- Add `GET/PUT /api/v1/me/preferences` endpoint  
**Frontend changes:**
- Unsubscribe landing page (clean, branded)
- Member preference center (opt in/out of campaigns, announcements, etc.)  
**Validation:** Click unsubscribe link → removed from future sends. Update preferences → respected.  
**Effort:** ~1 day

### Task 4.3 — Drip Campaigns (Automated Sequences)
**Status:** ⬜  
**What:** No automated email sequences (welcome series, renewal reminders, re-engagement).  
**Backend changes:**
- New model: `EmailSequence` with steps (delay_days, template, condition)
- New model: `EmailSequenceEnrollment` — member in sequence + current step
- New Celery task: `process_sequences()` — checks enrollments, sends due emails, advances step
- Auto-enroll on events: new member → welcome series, expired → re-engagement  
**Frontend changes:**
- Sequence builder page (list steps, set delays, choose templates)
- Enrollment dashboard (who's in what sequence, progress)  
**Validation:** Create welcome series (day 0, 3, 7) → enroll new member → verify emails sent on schedule.  
**Effort:** ~2 days

---

## Phase 5: AI Differentiators 🤖
*What makes AssocHub unique vs every other AMS.*

### Task 5.1 — Real ML Churn Model
**Status:** ⬜  
**What:** `ChurnPredictor` field exists but has no actual model. Build a real scikit-learn model.  
**Backend changes:**
- Create `backend/app/ai/ml/churn.py` — train/predict with scikit-learn
- Features: days since last login, event attendance, payment timeliness, tenure, group membership
- Training endpoint: trains on current member data, saves model with joblib
- Prediction endpoint: scores all members, returns risk levels (low/medium/high/critical)
- Scheduled retrain: weekly Celery beat task  
**Validation:** Train on 94 members → predict churn → verify predictions make intuitive sense.  
**Effort:** ~1-2 days

### Task 5.2 — Real Engagement Scoring
**Status:** ⬜  
**What:** `engagement_score` field exists but is always 0.0.  
**Backend changes:**
- Create `backend/app/ai/ml/engagement.py`
- Scoring factors: event attendance (25%), payment timeliness (25%), email engagement (20%), login frequency (15%), group participation (15%)
- Normalize to 0-100 scale
- Daily Celery task to recalculate all member scores  
**Validation:** Members with high activity → high score. Inactive members → low score.  
**Effort:** ~4-6 hours

### Task 5.3 — Smart Member Segmentation
**Status:** ⬜  
**What:** No AI-driven audience grouping.  
**Backend changes:**
- Create `backend/app/ai/segmentation.py`
- Auto-segments: "At Risk", "Champions", "New Members", "Dormant", "High Value"
- Based on churn score + engagement score + tenure + payment history
- Endpoint: `GET /api/v1/ai/segments` — returns segments with member counts
- Endpoint: `GET /api/v1/ai/segments/{name}/members` — members in segment  
**Frontend changes:**
- Segment cards on analytics/AI page with member counts and drill-down  
**Validation:** Run segmentation → see 5+ meaningful groups → click into each to see members.  
**Effort:** ~1 day

---

## Phase 6: Production Readiness 🏭
*Everything needed to deploy with confidence.*

### Task 6.1 — CI/CD Pipeline
**Status:** ⬜  
**What:** No automated testing or deployment pipeline.  
**Steps:**
- Create `.github/workflows/ci.yml`:
  - On push/PR: install deps → lint → run tests → build frontend → report
- Create `.github/workflows/deploy.yml`:
  - On merge to main: SSH → pull → migrate → restart services  
**Validation:** Push to branch → CI runs → PR shows green check.  
**Effort:** ~3-4 hours

### Task 6.2 — Prometheus Metrics + Health Dashboard
**Status:** ⬜  
**What:** No metrics collection or monitoring.  
**Backend changes:**
- Add `prometheus-fastapi-instrumentator` — auto-collect request metrics
- Add custom metrics: members count, active sessions, email send rate
- Add `GET /metrics` endpoint  
**Frontend changes:**
- System status page showing service health, DB stats, memory usage  
**Validation:** Hit `/metrics` → see Prometheus metrics. Check system page → see live stats.  
**Effort:** ~3-4 hours

### Task 6.3 — Automated Backups
**Status:** ⬜  
**What:** No database backup system.  
**Steps:**
- Create backup script: `pg_dump` → compress → store locally (S3 later)
- Add cron job: daily at 3 AM UTC
- Add retention: keep 7 daily, 4 weekly
- Add `POST /api/v1/admin/backups` endpoint (trigger manual backup)  
**Validation:** Run backup → verify file exists → restore to test DB → verify data intact.  
**Effort:** ~2-3 hours

### Task 6.4 — Two-Factor Authentication (2FA)
**Status:** ⬜  
**What:** No 2FA/MFA support.  
**Backend changes:**
- Add `pyotp` dependency (TOTP)
- Add `POST /api/v1/auth/2fa/enable` — generates secret + QR code
- Add `POST /api/v1/auth/2fa/verify` — verify TOTP code
- Add `POST /api/v1/auth/2fa/disable` — disable with current code
- Update login flow: if 2FA enabled → require TOTP after password  
**Frontend changes:**
- 2FA setup page (show QR code, enter verification code)
- Login flow: 2FA input step  
**Validation:** Enable 2FA → scan QR → login requires code → works.  
**Effort:** ~1 day

### Task 6.5 — ICS Calendar Export
**Status:** ⬜  
**What:** No calendar export for events.  
**Backend changes:**
- Add `icalendar` dependency
- Add `GET /api/v1/events/{id}/ics` — returns `.ics` file
- Include event title, description, location, start/end times, organizer  
**Frontend changes:**
- "Add to Calendar" button on event detail page (Google, Apple, Outlook options)  
**Validation:** Download ICS → open in Google Calendar → event appears correctly.  
**Effort:** ~2-3 hours

### Task 6.6 — Dark Mode
**Status:** ⬜  
**What:** No theme toggle.  
**Frontend changes:**
- Add `next-themes` dependency
- Create `ThemeToggle` component
- Add to header
- Configure Tailwind dark mode  
**Validation:** Toggle dark mode → entire UI switches → persists across refresh.  
**Effort:** ~2 hours

### Task 6.7 — Notification Center
**Status:** ⬜  
**What:** Notifications exist in DB but no UI to view them.  
**Frontend changes:**
- Create `NotificationCenter` dropdown component in header
- Show unread count badge
- List notifications with read/unread state
- Mark as read on click
- Link to relevant pages  
**Backend changes:**
- Add `PUT /api/v1/notifications/{id}/read`
- Add `POST /api/v1/notifications/read-all`  
**Validation:** Trigger notification → bell icon shows badge → click → opens panel → mark read.  
**Effort:** ~3-4 hours

---

## 📊 Progress Tracker

| Phase | Tasks | Done | Progress |
|-------|-------|------|----------|
| 1. Foundation | 4 | 0 | 0% |
| 2. Member Experience | 3 | 2 | 67% |
| 3. Financial Completeness | 4 | 0 | 0% |
| 4. Communications | 3 | 0 | 0% |
| 5. AI Differentiators | 3 | 0 | 0% |
| 6. Production Readiness | 7 | 0 | 0% |
| **TOTAL** | **24** | **3** | **12.5%** |

**Estimated Total Effort:** ~15-20 days of focused work

---

## 🔄 How We Work

1. Tahira approves next task
2. I build it (backend + frontend + tests)
3. Commit & push to GitHub
4. Deploy to production
5. Verify it works live
6. Mark ✅ in this plan
7. Move to next task

---

*Plan created: 2026-07-25*
*Last updated: 2026-07-25*
