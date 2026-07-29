# 🏛️ AssocHub - Gap Fix Execution Plan

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

### Task 1.1 - RBAC Enforcement
**Status:** ✅
**Done:** 2026-07-25 | **Commit:** e23ee9c
**What:** 46 granular permissions across 11 modules. Role hierarchy: super_admin (46), tenant_admin (41), staff (30), member (8). PermissionChecker dependency, User model custom_permissions, JWT-embedded permissions, frontend PermissionGate + usePermissions hook + sidebar filtering. Verified with 3 role types.

### Task 1.2 - Alembic Migrations
**Status:** ✅
**Done:** 2026-07-27
**What:** Generated migration scripts for all 60+ tables. 5 migration versions in `backend/alembic/versions/`:
- `ac8b8a4a13f3` — initial schema (all 9 modules)
- `b1a2c3d4e5f6` — custom permissions
- `8a1b2c3d4e5f` — email sending logs
- `733cc2117d46` — AI and integrations modules
- `0040638c77bf` — remaining 8 modules (finances, comms)

`alembic.ini` configured with async PostgreSQL URL.

### Task 1.3 - Test Suite Setup
**Status:** ✅
**Done:** 2026-07-28 | **Commit:** 61371a0
**What:** pytest + httpx async test infrastructure with 42 tests.
**Files created:**
- `tests/conftest.py` — async HTTP client, mock DB session, auth token fixtures
- `tests/test_auth.py` — 20 tests: JWT create/decode, password hashing, schemas, model imports, app creation, route existence
- `tests/test_health.py` — 4 tests: health endpoint, version info, OpenAPI, 404 handling
- `tests/test_members.py` — 18 tests: member schemas, enums, table names, RBAC permissions, API endpoint auth
**Validation:** `pytest -v` — 42 passed, 0 failed.

### Task 1.4 - Auto-Renewal & Expiry Scheduler
**Status:** ✅
**Done:** 2026-07-28 | **Commit:** c93a634
**What:** Members silently lapse with no warning. Three Celery beat tasks built:
- `check_membership_renewals()` — daily at 8 AM, sends 7/3/1 day expiry reminders
- `process_auto_renewals()` — daily at 9 AM, charges stored payment methods via Stripe
- `mark_lapsed_memberships()` — daily at 10 AM, changes expired members to `lapsed`
**Backend changes:**
- `backend/app/tasks/memberships.py` — rewrote with proper async, fixed enum bug, added all 3 tasks
- `backend/app/modules/finances/crud.py` — added `charge_auto_renewal()` with Stripe PaymentIntent
- `backend/app/celery_app.py` — added to include list + 3 beat schedule entries
- `backend/app/modules/members/router.py` — admin-only manual trigger endpoints
**Validation:** Tasks compile, Celery discovers them, beat schedule configured.

---

## Phase 2: Member Experience 👥
*Members are the product. Let them self-serve.*

### Task 2.1 — Member Self-Service Portal
**Status:** ✅  
**Done:** 2026-07-27 | **Commit:** 5ed6dd5  
**What:** Member-facing pages for self-service.  
**Frontend:**
- `/profile` — view/edit personal info, change password, see membership details
- `/my-invoices` — view invoices, download PDFs, outstanding balance summary
- `/my-events` — browse events, register/cancel, view past events
- Sidebar: 'My Account' section (Profile, My Invoices, My Events) visible to all
- Sidebar: 'Management' section filtered by permissions (admin/staff only)  
**Backend:** All `/me` endpoints already existed (GET/PATCH /me, change-password, membership, events, documents).

### Task 2.2 - File Upload (Documents Module)
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** e23ee9c
**What:** Documents module metadata-only. Added actual file storage.

### Task 2.3 - Invoice PDF Generation
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 8c60404
**What:** PDF invoice generation with WeasyPrint + Jinja2 templates.
**Backend:** `backend/app/core/pdf.py` (generate_invoice_pdf, generate_receipt_pdf), `backend/templates/pdf/invoice.html` + `receipt.html`. Admin PDF: `GET /api/v1/finances/invoices/{id}/pdf`. Member PDF: `GET /api/v1/finances/my/invoices/{id}/pdf`.
**Frontend:** Download PDF button on invoice rows in finances page.
**Validation:** Created test invoice → downloaded PDF → verified 13KB+ valid PDF with line items, totals, dates.

---

## Phase 3: Financial Completeness 💰
*Revenue features make an AMS commercially viable.*

### Task 3.1 - Discount/Promo Codes
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** Discount codes for events and memberships.
**Backend:** `DiscountCode` model in `finances/models.py` — code, type (percentage/fixed), value, max_uses, valid_from, valid_to, applicable_to. CRUD endpoints in `finances/router.py`.
**Frontend:** Discount code management page at `/discount-codes`.

### Task 3.2 - Payment Receipts
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** Auto-send PDF receipts after payment.
**Backend:** `backend/templates/pdf/receipt.html` template. Receipt generation in `backend/app/core/pdf.py`.

### Task 3.3 - Refund Processing
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** Actual Stripe refund processing.
**Backend:** `POST /api/v1/finances/payments/{payment_id}/refund` endpoint — calls `stripe.Refund.create()`, updates payment status to "refunded", generates credit note.
**Frontend:** "Refund" button on payment detail (admin only).

### Task 3.4 - Financial Reports (P&L)
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** Revenue, expenses, net income views.
**Backend:** `backend/app/core/reports.py` — revenue summary, expense summary, P&L, cash flow. Date range filtering. CSV + PDF export.
**Frontend:** Analytics page with financial report widgets (Recharts). Date range picker. Export buttons.

---

## Phase 4: Communications Upgrade 📧
*Move from "we can send emails" to "smart communication platform."*

### Task 4.1 - Email Open/Click Tracking
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** Tracking pixels and click-through URL wrapping.
**Backend:** `GET /api/v1/communications/track/open/{tracking_id}` — 1x1 pixel tracking. `GET /api/v1/communications/track/click/{tracking_id}` — redirect + track. Events stored in `email_tracking_events` table.
**Frontend:** Open rate / click rate per campaign. Per-recipient engagement data.

### Task 4.2 - Unsubscribe Management
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 22ad481
**What:** Opt-out handling (CAN-SPAM, GDPR).
**Backend:** `unsubscribe_token` field on email sending logs. `GET /api/v1/unsubscribe/{token}` — one-click unsubscribe. `Preferences` model for email preferences per category. `GET/PUT /api/v1/me/preferences`.
**Frontend:** Unsubscribe landing page. Member preference center.

### Task 4.3 - Drip Campaigns (Automated Sequences)
**Status:** ✅
**Done:** 2026-07-28 | **Commit:** 3ae6fdd
**What:** Automated multi-step email sequences with triggers, branching, and scheduling.
**Models:** DripCampaign, DripStep (email/wait/condition), DripEnrollment, DripLog
**CRUD:** create/list/update campaigns, manage steps, enroll members, activate/pause
**API:** 8 endpoints — CRUD campaigns + steps, activate/pause, enroll members
**Celery:** process_pending_drips (every 5 min), enroll_trigger_members (hourly)
**DB:** Alembic migration for 4 new tables (drip_campaigns, drip_steps, drip_enrollments, drip_logs)
**Validation:** All 42 existing tests pass, import/syntax verified.

---

## Phase 5: AI Differentiators 🤖
*What makes AssocHub unique vs every other AMS.*

### Task 5.1 - Real ML Churn Model
**Status:** ⬜
**What:** `ChurnPredictor` field exists but has no actual model. Build a real scikit-learn model.
**Backend changes:**
- Create `backend/app/ai/ml/churn.py` - train/predict with scikit-learn
- Features: days since last login, event attendance, payment timeliness, tenure, group membership
- Training endpoint: trains on current member data, saves model with joblib
- Prediction endpoint: scores all members, returns risk levels (low/medium/high/critical)
- Scheduled retrain: weekly Celery beat task
**Validation:** Train on 94 members → predict churn → verify predictions make intuitive sense.
**Effort:** ~1-2 days

### Task 5.2 - Real Engagement Scoring
**Status:** ⬜
**What:** `engagement_score` field exists but is always 0.0.
**Backend changes:**
- Create `backend/app/ai/ml/engagement.py`
- Scoring factors: event attendance (25%), payment timeliness (25%), email engagement (20%), login frequency (15%), group participation (15%)
- Normalize to 0-100 scale
- Daily Celery task to recalculate all member scores
**Validation:** Members with high activity → high score. Inactive members → low score.
**Effort:** ~4-6 hours

### Task 5.3 - Smart Member Segmentation
**Status:** ⬜
**What:** No AI-driven audience grouping.
**Backend changes:**
- Create `backend/app/ai/segmentation.py`
- Auto-segments: "At Risk", "Champions", "New Members", "Dormant", "High Value"
- Based on churn score + engagement score + tenure + payment history
- Endpoint: `GET /api/v1/ai/segments` - returns segments with member counts
- Endpoint: `GET /api/v1/ai/segments/{name}/members` - members in segment
**Frontend changes:**
- Segment cards on analytics/AI page with member counts and drill-down
**Validation:** Run segmentation → see 5+ meaningful groups → click into each to see members.
**Effort:** ~1 day

---

## Phase 6: Production Readiness 🏭
*Everything needed to deploy with confidence.*

### Task 6.1 - CI/CD Pipeline
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** GitHub Actions workflows.
- `ci.yml` — On push/PR: install deps → lint → run tests → build frontend → report
- `deploy.yml` — On merge to main: SSH → pull → migrate → restart services
- `deploy-docs.yml` — Documentation deployment

### Task 6.2 - Prometheus Metrics + Health Dashboard
**Status:** ⬜
**What:** No metrics collection or monitoring.
**Backend changes:**
- Add `prometheus-fastapi-instrumentator` - auto-collect request metrics
- Add custom metrics: members count, active sessions, email send rate
- Add `GET /metrics` endpoint
**Frontend changes:**
- System status page showing service health, DB stats, memory usage
**Validation:** Hit `/metrics` → see Prometheus metrics. Check system page → see live stats.
**Effort:** ~3-4 hours

### Task 6.3 - Automated Backups
**Status:** ⬜
**What:** No database backup system.
**Steps:**
- Create backup script: `pg_dump` → compress → store locally (S3 later)
- Add cron job: daily at 3 AM UTC
- Add retention: keep 7 daily, 4 weekly
- Add `POST /api/v1/admin/backups` endpoint (trigger manual backup)
**Validation:** Run backup → verify file exists → restore to test DB → verify data intact.
**Effort:** ~2-3 hours

### Task 6.4 - Two-Factor Authentication (2FA)
**Status:** ⬜
**What:** No 2FA/MFA support.
**Backend changes:**
- Add `pyotp` dependency (TOTP)
- Add `POST /api/v1/auth/2fa/enable` - generates secret + QR code
- Add `POST /api/v1/auth/2fa/verify` - verify TOTP code
- Add `POST /api/v1/auth/2fa/disable` - disable with current code
- Update login flow: if 2FA enabled → require TOTP after password
**Frontend changes:**
- 2FA setup page (show QR code, enter verification code)
- Login flow: 2FA input step
**Validation:** Enable 2FA → scan QR → login requires code → works.
**Effort:** ~1 day

### Task 6.5 - ICS Calendar Export
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** 5fa2bce
**What:** Calendar export for events.
**Backend:** `GET /api/v1/events/{event_id}/ics` — returns `.ics` file with event title, description, location, start/end times, organizer.
**Frontend:** "Add to Calendar" button on event detail page.

### Task 6.6 - Dark Mode
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** bcf5280
**What:** Theme toggle.
**Frontend:** `next-themes` ThemeProvider in `layout.tsx`. Toggle component. Persists across refresh.

### Task 6.7 - Notification Center
**Status:** ✅
**Done:** 2026-07-27 | **Commit:** bcf5280
**What:** Notification UI.
**Frontend:** `notification-center.tsx` — bell icon, unread badge, read/unread state, mark as read.
**Backend:** `PUT /api/v1/notifications/{id}/read` + `POST /api/v1/notifications/read-all`.

---

## 📊 Progress Tracker

| Phase | Tasks | Done | Remaining |
|-------|-------|------|-----------|
| 1. Foundation | 4 | 4 | — |
| 2. Member Experience | 3 | 3 | — |
| 3. Financial Completeness | 4 | 4 | — |
| 4. Communications | 3 | 3 | — |
| 5. AI Differentiators | 3 | 0 | 3 (Churn, Engagement, Segmentation) |
| 6. Production Readiness | 7 | 4 | 3 (Prometheus, Backups, 2FA) |
| **TOTAL** | **24** | **19 (79%)** | **5 (21%)** |

**Remaining Estimated Effort:** ~3-4 days

---

## 🔴 What's Left (5 tasks)

| Priority | Task | Effort | Notes |
|----------|------|--------|-------|
| 1 | **5.1** ML Churn Model | ~1-2 days | scikit-learn prediction |
| 2 | **5.2** Engagement Scoring | ~4-6h | Weighted scoring system |
| 3 | **5.3** Smart Segmentation | ~1 day | Auto-segments from scores |
| 4 | **6.2** Prometheus Metrics | ~3-4h | Monitoring + health dashboard |
| 5 | **6.3** Automated Backups | ~2-3h | pg_dump + cron + retention |
| 6 | **6.4** Two-Factor Auth | ~1 day | TOTP + QR code + login flow |

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

## UI Redesign (2026-07-29)

**Scope:** Full visual overhaul of all 22 frontend routes. Premium 3D teal+white SaaS design.

### Commits
- `d2ce938` — Fix false claims on /why and /marketing pages (Groq→OpenRouter, remove fake testimonials, etc.)
- Previous commits (17 files) — Premium 3D teal+white redesign of all dashboard pages, login, shared components

### What Changed
- **Shared Components:** PageHeader (gradient teal), StatCard (3D hover), DataTable (gradient header), Modal (glass morphism), StatusBadge (dot indicator), Tabs (pill style), SearchInput, Pagination
- **Layout:** Glass morphism header with backdrop blur, premium gradient background
- **Sidebar:** Gradient active indicators, teal branding
- **Dashboard:** Gradient stat cards, timeline activity, AI insights panel, financial summary
- **Login:** Animated orbs, dark gradient background, glass card
- **All Pages:** Teal gradient buttons, rounded-2xl cards, stagger animations, premium forms
- **Notification Center:** Portal-based dropdown (fixes clipping by header), premium styling
- **AI Page:** Fixed invisible chat input (custom color utilities added to globals.css)
- **Marketing/Why:** Removed all false claims (Groq→OpenRouter, removed fake testimonials, fixed pricing claims)

### Content Corrections (Honesty Pass)
- ❌ "Groq AI" → ✅ "OpenRouter LLMs" (actual provider)
- ❌ "~$29/mo managed" → ✅ "Free (self-hosted)" (no managed plan exists)
- ❌ Fake testimonials → ✅ Removed, replaced with Open Source / Self-Hosted cards
- ❌ "A/B Testing" claim → ✅ Removed (not implemented)
- ❌ "Stripe Payments" → ✅ "Stripe Checkout" (configurable, not active)
- ❌ "156 API endpoints" → ✅ "200+" (actual count)
- ❌ README "Groq AI" → ✅ "OpenRouter LLMs"

---

*Plan created: 2026-07-25*
*Last updated: 2026-07-29* (UI redesign + content honesty pass)
