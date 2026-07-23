# 🏛️ AssocHub — AI-Powered Association Management System

> Production-ready, multi-tenant AMS with deep AI integration, not just a chatbot bolted onto old software.

---

## 🎯 The Problem with Existing AMS

| AMS Product | Pain Point |
|---|---|
| Wild Apricot | Limited customization, shallow AI, poor reporting |
| MemberClicks | Dated UI, expensive, no real AI |
| YourMembership | Clunky UX, weak integrations |
| Personify/NetFORUM | Enterprise complexity, slow innovation, $$$ |
| Fonterva (Salesforce) | Salesforce lock-in, massive cost |
| StarChapter | Chapter-only focus, limited modules |

**Common gaps across ALL of them:**
- AI is a chatbot or afterthought, not a core engine
- No predictive analytics (churn, revenue, engagement)
- Document generation is manual or template-only
- Elections are bolted-on, not built-in with audit integrity
- No composable modules — you pay for everything or nothing
- Communication is blast-only, not personalized/intelligent
- Financial reporting requires export → Excel → manual analysis

---

## 🧬 What Makes AssocHub Different

### 1. AI as the Core Engine (Not a Feature)
Every module has AI baked in:
- **Predictive Member Churn** — ML model flags at-risk members 60 days before renewal
- **Smart Onboarding** — AI generates personalized welcome journeys based on member type, industry, goals
- **Document Intelligence** — Auto-generates meeting minutes, bylaws, resolutions, financial summaries
- **Event Optimization** — AI analyzes attendance patterns, suggests optimal dates/times/venues
- **Financial Anomaly Detection** — Auto-flags unusual transactions, budget overruns, fraud signals
- **Communication AI** — Write-tone optimization, send-time prediction, engagement scoring
- **Governance Copilot** — AI monitors compliance deadlines, suggests agenda items, flags conflicts of interest

### 2. Composable Module Architecture
- Organizations activate only what they need
- Each module is independently deployable
- Pay-per-module pricing (not all-or-nothing)
- Custom modules can be added via plugin API

### 3. True Multi-Tenancy
- Complete data isolation (not just a tenant_id column)
- Tenant-aware database schemas or row-level security
- Per-tenant AI model fine-tuning (custom voice, tone, terminology)
- White-label support (custom domains, branding, themes)

### 4. Real-Time Intelligence Dashboard
- Not just charts — actionable insights
- "3 members are likely to churn this month" → One-click retention campaign
- "Budget will exceed plan by $12K if trend continues" → Auto-reallocate suggestions
- "Election turnout is 40% lower than target" → Targeted outreach recommendations

### 5. Open & Extensible
- REST + GraphQL APIs for every feature
- Webhook system for integrations
- Plugin architecture for custom modules
- Import/export any data in standard formats

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web App  │  │Mobile PWA│  │  Admin   │  │  Member  │   │
│  │ (Next.js)│  │          │  │  Portal  │  │  Portal  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼──────────────┼────────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────┐
│                      API GATEWAY                            │
│           (Rate Limiting, Auth, Tenant Routing)             │
│              Traefik / Custom Middleware                     │
└───────┬──────────────┬──────────────┬──────────────┬────────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────┐
│              PYTHON BACKEND (FastAPI)                        │
│           Single codebase — No Node.js ↔ Python boundary    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Core Services                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ Identity │ │ Members  │ │ Finances │            │    │
│  │  │ & Auth   │ │ Module   │ │ Module   │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Events  │ │  Comms   │ │Elections │            │    │
│  │  │  Module  │ │  Module  │ │ Module   │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │Documents │ │Analytics │ │ Workflows│            │    │
│  │  │ Module   │ │ Module   │ │  Engine  │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AI Engine (same process)                │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ Churn    │ │ Document │ │ Anomaly  │            │    │
│  │  │ Predictor│ │ Generator│ │ Detector │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │   RAG    │ │  Smart   │ │  Event   │            │    │
│  │  │  Search  │ │Segments  │ │Optimizer │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Shared Infrastructure                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ Tenant   │ │  Audit   │ │  Plugin  │            │    │
│  │  │ Manager  │ │  Logger  │ │ Registry │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
└───────┬──────────────┬──────────────┬──────────────┬────────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────┐
│                     DATA LAYER                              │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │PostgreSQL│ │  Redis   │ │  S3/MinIO│ │ pgvector │       │
│  │ (Core)   │ │ (Cache)  │ │  (Files) │ │ (Vectors)│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │Meilisearch│ │  Celery  │ │Temporal  │                     │
│  │ (Search) │ │(Workers) │ │(Workflows)│                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐍 Tech Stack — Full Python

### Why Python All the Way

| Factor | Decision |
|---|---|
| **No boundary** | AI features call the same ORM, same auth, same DB directly |
| **One language** | Faster dev, simpler onboarding, fewer bugs at integration points |
| **ML ecosystem** | scikit-learn, PyTorch, Hugging Face, pandas — native |
| **Async** | FastAPI + asyncio = high concurrency without Node.js complexity |
| **Validation** | Pydantic v2 = fastest Python validation, auto-generates JSON Schema |
| **ORM** | SQLAlchemy 2.0 (async) + Alembic migrations |
| **Task Queue** | Celery with Redis broker (or ARQ for lighter setup) |
| **WebSockets** | Native FastAPI support for real-time updates |

### Full Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Backend** | FastAPI | 0.115+ | Async, auto-docs, Pydantic, Python-native AI |
| **ORM** | SQLAlchemy 2.0 | 2.0+ | Async, mature, excellent for complex queries |
| **Migrations** | Alembic | — | Pairs with SQLAlchemy, supports multi-tenant |
| **Validation** | Pydantic v2 | 2.0+ | Fastest Python validation, JSON Schema |
| **Auth** | Custom JWT + RBAC | — | Full control, tenant-aware |
| **Task Queue** | Celery / ARQ | — | Background jobs, scheduled tasks |
| **Frontend** | Next.js 15 + shadcn/ui | — | SSR, RSC, accessible, TypeScript |
| **Mobile** | PWA (primary) | — | Offline support, push, no app store |
| **Database** | PostgreSQL 16 + RLS | — | Multi-tenant, ACID, pgvector |
| **Cache** | Redis 7 | — | Sessions, queues, rate limiting |
| **Search** | Meilisearch | — | Fast, typo-tolerant, tenant-aware |
| **Vector DB** | pgvector | — | Embeddings in existing PostgreSQL |
| **File Storage** | S3/MinIO | — | Documents, avatars, exports |
| **Workers** | Celery + Redis | — | Async jobs, retries, scheduling |
| **Workflow** | Temporal.io (Python SDK) | — | Durable, observable workflows |
| **Monitoring** | Prometheus + Grafana | — | Metrics, dashboards, alerts |
| **Tracing** | OpenTelemetry | — | Distributed tracing |
| **CI/CD** | GitHub Actions | — | Test → Build → Deploy |
| **Container** | Docker + Docker Compose | — | Local dev, production parity |
| **Orchestration** | Kubernetes | — | Scalable production deploy |
| **IaC** | Terraform | — | Reproducible infrastructure |

---

## 📁 Project Structure

```
assochub/
├── backend/                     # Python FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app factory
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── dependencies.py      # FastAPI dependencies
│   │   │
│   │   ├── core/                # Shared infrastructure
│   │   │   ├── auth/            # JWT, RBAC, permissions
│   │   │   ├── tenant/          # Multi-tenant middleware & utils
│   │   │   ├── audit/           # Audit logging
│   │   │   ├── security/        # Encryption, rate limiting
│   │   │   ├── exceptions/      # Custom exception handlers
│   │   │   └── middleware/       # CORS, tenant routing, logging
│   │   │
│   │   ├── modules/             # Feature modules
│   │   │   ├── members/         # Member management
│   │   │   │   ├── models.py    # SQLAlchemy models
│   │   │   │   ├── schemas.py   # Pydantic schemas
│   │   │   │   ├── router.py    # FastAPI routes
│   │   │   │   ├── service.py   # Business logic
│   │   │   │   ├── crud.py      # Database operations
│   │   │   │   └── tests/       # Module tests
│   │   │   │
│   │   │   ├── finances/        # Financial management
│   │   │   ├── events/          # Event management
│   │   │   ├── communications/  # Email, SMS, push
│   │   │   ├── elections/       # Voting & elections
│   │   │   ├── documents/       # Document management
│   │   │   ├── analytics/       # Reports & dashboards
│   │   │   └── workflows/       # Automation engine
│   │   │
│   │   ├── ai/                  # AI engine (same process!)
│   │   │   ├── models/          # ML models
│   │   │   ├── services/        # AI business logic
│   │   │   ├── pipelines/       # Data pipelines
│   │   │   ├── prompts/         # LLM prompt templates
│   │   │   └── embeddings/      # Vector operations
│   │   │
│   │   └── plugins/             # Plugin architecture
│   │       ├── registry.py      # Plugin discovery
│   │       ├── loader.py        # Dynamic loading
│   │       └── base.py          # Plugin base class
│   │
│   ├── alembic/                 # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── tests/                   # Test suite
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── scripts/                 # Management scripts
│   │   ├── seed.py              # Demo data
│   │   └── migrate.py           # Migration runner
│   │
│   ├── pyproject.toml           # Dependencies (uv/poetry)
│   ├── Dockerfile
│   └── alembic.ini
│
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App router pages
│   │   ├── components/          # UI components
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # API client, utils
│   │   ├── stores/              # State management
│   │   └── types/               # TypeScript types
│   │
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── Dockerfile
│   └── next.config.ts
│
├── infra/                       # Infrastructure as Code
│   ├── terraform/
│   ├── kubernetes/
│   └── docker-compose.yml
│
├── docs/                        # Documentation
│   ├── api/                     # Auto-generated OpenAPI
│   ├── architecture/
│   └── user-guides/
│
├── .github/                     # CI/CD
│   └── workflows/
│
├── .env.example
├── Makefile
├── docker-compose.yml
└── README.md
```

---

## 📦 Modules (Deep Dive)

### 1. 👥 Member Management
- **Profiles** — Rich member profiles with custom fields per tenant
- **Membership Tiers** — Free, Basic, Premium, Corporate, Lifetime
- **Lifecycle Management** — Onboarding → Active → Renewal → Lapsed → Re-engaged
- **AI Predictions** — Churn risk score, engagement score, lifetime value
- **Self-Service Portal** — Members update own profiles, renew, pay
- **Bulk Operations** — Import/export, mass email, tag management
- **Groups & Chapters** — Hierarchical organization support
- **Skills & Interests** — Matching members for mentorship, committees

### 2. 💰 Financial Management
- **Dues & Billing** — Auto-renewal, prorated, installment plans
- **Invoicing** — Auto-generated, customizable templates (Jinja2)
- **Payment Processing** — Stripe integration, multiple payment methods
- **Expense Tracking** — Categorized expenses with approval workflows
- **Budgeting** — AI-assisted budget creation and variance analysis
- **Financial Reports** — P&L, balance sheet, cash flow (auto-generated PDFs)
- **Anomaly Detection** — AI flags unusual transactions
- **Grant Management** — Track grants, deadlines, reporting requirements
- **Tax Compliance** — 1099 generation, deduction tracking

### 3. 📅 Event Management
- **Event Types** — Conferences, webinars, workshops, social events, AGMs
- **Registration** — Custom forms, pricing tiers, discount codes
- **Venue Management** — Room booking, capacity tracking
- **Virtual Events** — Zoom/Meet integration, live streaming
- **AI Optimization** — Best date/time suggestions based on historical data
- **Speaker Management** — Profiles, availability, session scheduling
- **Networking** — AI-powered attendee matching
- **Post-Event** — Surveys, feedback analysis, ROI calculation
- **Recurring Events** — Calendar sync, automated reminders

### 4. 📧 Communication Hub
- **Email Campaigns** — Drag-and-drop builder, A/B testing
- **Smart Segmentation** — AI-driven audience grouping
- **Personalization** — Dynamic content per member segment
- **Send-Time Optimization** — AI predicts best send time per member
- **Multi-Channel** — Email, SMS, push notifications, in-app
- **Templates** — AI-generated drafts based on past campaigns
- **Analytics** — Open rates, click-through, engagement scoring
- **Newsletter** — Auto-curated content from member activities

### 5. 🗳️ Elections & Voting
- **Election Setup** — Nomination periods, candidate profiles
- **Secure Voting** — End-to-end encrypted ballots
- **Audit Trail** — Immutable vote log (optional blockchain anchoring)
- **Proxy Voting** — Delegated voting with verification
- **Real-Time Results** — Live tally with publish controls
- **Bylaws Integration** — AI checks election rules compliance
- **Multi-Race Support** — Board, committees, referendums simultaneously

### 6. 📄 Document Management
- **Document Repository** — Versioned, categorized, searchable
- **AI Document Generation** — Meeting minutes, bylaws, resolutions, reports
- **Template Engine** — Dynamic templates (Jinja2) with member/event data injection
- **E-Signatures** — Integrated signing workflow
- **Compliance** — Retention policies, access controls
- **OCR/Extraction** — AI extracts data from uploaded documents
- **RAG Search** — Semantic search across all documents via pgvector

### 7. 📊 Analytics & Intelligence
- **Dashboard** — Real-time KPIs (membership growth, revenue, engagement)
- **Custom Reports** — Drag-and-drop report builder
- **Predictive Analytics** — Revenue forecasting, membership projections
- **Comparisons** — Year-over-year, peer benchmarks
- **Export** — PDF, Excel, CSV, API access
- **Scheduled Reports** — Auto-delivered to stakeholders

### 8. ⚙️ Workflow Automation
- **Visual Builder** — Drag-and-drop workflow creation
- **Triggers** — Events, schedules, conditions, webhooks
- **Actions** — Send email, update record, create task, call API
- **Branching** — If/else logic, loops, delays
- **Templates** — Pre-built workflows (onboarding, renewal, event follow-up)
- **Audit** — Full execution log with rollback

### 9. 🔌 Integrations
- **CRM** — Salesforce, HubSpot connectors
- **Accounting** — QuickBooks, Xero sync
- **Calendar** — Google Calendar, Outlook
- **Communication** — Slack, Microsoft Teams
- **Payment** — Stripe, PayPal, Square
- **SSO** — SAML, OAuth, OpenID Connect
- **Zapier/Make** — 5000+ app connections via webhook

---

## 🤖 AI Engine — Deep Integration

Since it's all Python, the AI features are **first-class citizens**, not services calling other services:

```python
# Example: Churn prediction runs in the same process as member queries
from app.ai.models.churn import ChurnPredictor
from app.modules.members.crud import get_members_at_risk

async def check_churn_risk(tenant_id: str):
    predictor = ChurnPredictor(tenant_id=tenant_id)
    at_risk = await predictor.predict_risk()
    # Same DB session, same auth, same tenant context
    await notify_admins(tenant_id, at_risk)
```

### AI Capabilities by Module

| Module | AI Feature | Model/Approach |
|---|---|---|
| Members | Churn prediction | scikit-learn gradient boosting |
| Members | Engagement scoring | Custom ML pipeline |
| Members | Member matching | Embedding similarity (pgvector) |
| Finances | Anomaly detection | Isolation Forest / Z-score |
| Finances | Revenue forecasting | Prophet / ARIMA |
| Events | Optimal scheduling | Historical pattern analysis |
| Events | Attendee matching | Collaborative filtering |
| Comms | Send-time optimization | Per-member engagement history |
| Comms | Content generation | LLM (GPT-4 / Claude / local) |
| Documents | Auto-generation | LLM + Jinja2 templates |
| Documents | Semantic search | pgvector + embeddings |
| Elections | Compliance checking | Rule engine + LLM |
| Analytics | Insight generation | LLM-powered narratives |

---

## 🛡️ Security & Compliance

- **Authentication** — JWT + refresh tokens, MFA (TOTP, SMS, WebAuthn)
- **Authorization** — RBAC with granular permissions per module
- **Tenant Isolation** — Row-Level Security (RLS) in PostgreSQL
- **Encryption** — TLS 1.3 in transit, AES-256 at rest
- **Audit Logs** — Every action logged with actor, timestamp, before/after
- **Data Privacy** — GDPR/CCPA compliance, data export, right to deletion
- **Rate Limiting** — Per-tenant, per-endpoint throttling (Redis-based)
- **Input Validation** — Pydantic on every request (automatic, enforced)
- **Dependency Scanning** — pip-audit in CI

---

## 🧪 Quality & DevOps

- **Testing** — pytest + httpx (async tests), Playwright for E2E, k6 for load
- **CI/CD** — GitHub Actions: lint → test → build → deploy
- **Feature Flags** — Unleash or custom for gradual rollouts
- **Blue/Green** — Zero-downtime releases via K8s rolling updates
- **Observability** — OpenTelemetry SDK → Jaeger/Tempo
- **Alerting** — Prometheus Alertmanager → Slack/PagerDuty
- **Docs** — Auto-generated from FastAPI (OpenAPI 3.1), MkDocs for guides
- **Accessibility** — WCAG 2.1 AA compliance on frontend

---

## 📅 Development Phases

### Phase 1: Foundation (Weeks 1–6)
**Goal:** Core infra + Members module

- [ ] FastAPI project scaffold (app factory, config, logging)
- [ ] SQLAlchemy models + Alembic setup
- [ ] Multi-tenant middleware (tenant_id injection, RLS)
- [ ] Authentication (JWT, MFA, refresh tokens)
- [ ] RBAC permission system
- [ ] Member module (CRUD, profiles, tiers, lifecycle)
- [ ] Member self-service portal (Next.js)
- [ ] Admin dashboard shell (Next.js)
- [ ] Docker Compose for local dev
- [ ] CI/CD pipeline (GitHub Actions)

### Phase 2: Core Business (Weeks 7–12)
**Goal:** Finances + Events + Communications

- [ ] Financial module (dues, invoicing, expenses)
- [ ] Stripe payment integration
- [ ] Event module (CRUD, registration, calendar)
- [ ] Email campaigns (drag-and-drop, A/B testing)
- [ ] Communication hub (multi-channel)
- [ ] Celery worker setup (background jobs)
- [ ] Search integration (Meilisearch)
- [ ] Basic analytics dashboard

### Phase 3: Intelligence (Weeks 13–18)
**Goal:** AI features + Advanced modules

- [ ] AI engine: churn prediction model
- [ ] AI engine: document generation (LLM + templates)
- [ ] AI engine: financial anomaly detection
- [ ] RAG-based document search (pgvector)
- [ ] Smart member segmentation
- [ ] Workflow automation engine
- [ ] Event optimization AI

### Phase 4: Governance & Polish (Weeks 19–24)
**Goal:** Elections + Production readiness

- [ ] Elections & voting module (encrypted ballots, audit)
- [ ] Audit logging system (every action tracked)
- [ ] Advanced reporting & analytics
- [ ] Plugin architecture
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation (API + user guides)
- [ ] Kubernetes manifests

### Phase 5: Scale & Launch (Weeks 25–30)
**Goal:** Production deployment + Iteration

- [ ] Load testing & optimization
- [ ] Multi-region deployment support
- [ ] Mobile PWA polish + offline support
- [ ] Onboarding wizard
- [ ] Help center
- [ ] Beta testing with partner associations
- [ ] Public launch

---

## 💰 Pricing Model (Suggested)

| Plan | Price | Modules Included |
|---|---|---|
| **Starter** | $99/mo | Members, Basic Comms, Events |
| **Professional** | $299/mo | + Finances, Documents, Analytics |
| **Enterprise** | $799/mo | + Elections, AI, Custom Integrations |
| **Custom** | Contact Us | White-label, On-prem, Custom AI |

---

## 🚀 Getting Started

```bash
# Clone and setup
git clone https://github.com/your-org/assochub.git
cd assochub
cp .env.example .env

# Install backend dependencies
cd backend && uv sync  # or: poetry install

# Install frontend dependencies
cd ../frontend && npm install

# Start infrastructure (DB, Redis, Meilisearch)
cd .. && docker-compose up -d

# Run migrations
cd backend && alembic upgrade head

# Seed demo data
python scripts/seed.py

# Start backend (terminal 1)
uvicorn app.main:app --reload

# Start frontend (terminal 2)
cd ../frontend && npm run dev

# Open browser
open http://localhost:3000
```

---

*Last updated: 2026-07-22*
