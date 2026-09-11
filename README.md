<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-green" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/python-3.12+-blue" alt="Python">
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791" alt="PostgreSQL">
</p>

<h1 align="center">AssocHub</h1>

<p align="center">
  <strong>Open-source Association Management System</strong><br>
  Multi-tenant · AI-powered · Self-hostable · No per-contact fees
</p>

<p align="center">
  <a href="https://ams.14.jugaar.ai">Live Demo</a> ·
  <a href="https://ams.14.jugaar.ai/docs">API Docs</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a>
</p>

---

## What is AssocHub?

AssocHub is a full-stack Association Management System for running professional organizations, chambers of commerce, alumni groups, and industry bodies. It handles members, events, finances, elections, communications, and more — with built-in AI features for churn prediction, engagement scoring, and smart segmentation.

**Built for:** Professional associations, trade organizations, alumni networks, chambers of commerce, industry bodies.

---

## Live Demo

🔗 **[ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

| | |
|---|---|
| **Admin** | `daniel.harris@example.com` / `demo1234` / tenant: `platform` |
| **Member** | `jane.smith@example.com` / `demo1234` / tenant: `demo-association` |

---

## Features

### Core Modules (11)

| Module | Endpoints | Highlights |
|--------|-----------|------------|
| 📊 **Dashboard** | 15 | KPIs, recent activity, AI insights, financial summary |
| 👥 **Members** | 37 | CRUD, groups, tags, bulk ops, CSV export, status management |
| 💰 **Finances** | 37 | Invoices, expenses, budgets, dues, Stripe checkout |
| 📅 **Events** | 21 | Registration, speakers, sessions, check-in, feedback |
| 📄 **Documents** | 21 | Upload, versioning, comments, sharing, categories |
| 🗳️ **Elections** | 18 | Positions, nominations, ranked-choice voting, results |
| ⚙️ **Workflows** | 16 | Automation engine, step editor, execution history |
| 📧 **Communications** | 36 | Campaigns, announcements, surveys, notifications |
| 📈 **Analytics** | 15 | Interactive charts, dashboards, reports, exports |
| 🤖 **AI Engine** | 12 | Chat, churn, anomalies, semantic search, doc generation |
| 🔗 **Integrations** | 17 | Webhooks, third-party connections, event logs |

### AI & Machine Learning

| Feature | Technology | Description |
|---------|-----------|-------------|
| 💬 Chat Assistant | OpenRouter LLMs | Natural language queries against your data |
| 📉 Churn Prediction | Scikit-learn (GradientBoosting) | 96% accuracy, 10 features, weekly retraining |
| 📊 Engagement Scoring | Weighted multi-factor | 5 factors: events, payments, email, login, groups |
| 🎯 Smart Segmentation | Rule-based + ML | 6 segments: Champions, Loyal, At Risk, New, Dormant, High Value |
| ⚠️ Anomaly Detection | Z-score / IQR | Financial and attendance anomaly detection |
| 🔎 Semantic Search | pgvector embeddings | Meaning-based document search |
| 📝 Doc Generation | LLM-assisted | Template-based document creation |
| 💡 Insights Engine | Cross-module analysis | Severity-ranked AI insights |

### Platform Features

| Feature | Status |
|---------|--------|
| Multi-tenancy | ✅ Row-level isolation per organization |
| RBAC | ✅ 46 permissions, 4 roles (super_admin, tenant_admin, staff, member) |
| 2FA / TOTP | ✅ QR code setup, verify, disable |
| Invitation-based onboarding | ✅ Admin invites via token link |
| Automated backups | ✅ pg_dump + gzip, daily/weekly retention |
| Prometheus metrics | ✅ `/metrics` endpoint for monitoring |
| Email (Resend) | ✅ Transactional email via Resend API |
| Drip campaigns | ✅ Automated email sequences |
| Auto-renewal | ✅ Membership renewal scheduler |

---

## Tech Stack

```
Backend       Python 3.12 · FastAPI · SQLAlchemy 2.0 (async) · Alembic
Frontend      Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Recharts
Database      PostgreSQL 16 · pgvector (embeddings)
AI/ML         OpenRouter LLMs · Scikit-learn · joblib
Email         Resend API (abstraction for SMTP/SendGrid/SES)
Queue         Celery + Redis
Payments      Stripe Checkout (configurable)
Auth          JWT (24h + refresh) · TOTP 2FA · bcrypt
Deployment    Nginx · Let's Encrypt · systemd · PM2
```

---

## Quick Start

### Prerequisites

- Python 3.12+, Node.js 18+, PostgreSQL 16+, Redis

### 1. Clone & configure

```bash
git clone git@github.com:tahiralatif/Association-Management-System.git
cd Association-Management-System
cp .env.example .env    # Edit with your database credentials and API keys
```

### 2. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py        # Creates demo data
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

### 3. Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8002/api npm run dev
```

### 4. Open

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8002/docs

---

## Project Structure

```
Association-Management-System/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── core/            # Auth, email, LLM, backup, monitoring
│   │   │   ├── auth/        # JWT, permissions, 2FA (TOTP)
│   │   │   ├── email/       # Resend + SMTP provider abstraction
│   │   │   ├── backup.py    # Automated DB backups
│   │   │   └── llm.py       # OpenRouter configuration
│   │   ├── modules/         # 11 feature modules
│   │   │   ├── members/     # Users, profiles, groups, tags
│   │   │   ├── finances/    # Invoices, payments, budgets
│   │   │   ├── events/      # Events, registration, sessions
│   │   │   ├── documents/   # Upload, versioning, sharing
│   │   │   ├── elections/   # Nominations, ranked-choice voting
│   │   │   ├── workflows/   # Automation engine
│   │   │   ├── communications/  # Campaigns, announcements, surveys
│   │   │   ├── analytics/   # Dashboards, reports, charts
│   │   │   ├── ai/          # Chat, insights, embeddings
│   │   │   ├── integrations/  # Webhooks, third-party
│   │   │   └── website/     # Page builder, themes
│   │   ├── ai/ml/           # ML models (churn, engagement, segmentation)
│   │   └── tasks/           # Celery background tasks
│   ├── alembic/             # Database migrations
│   └── templates/emails/    # Jinja2 email templates
├── frontend/                # Next.js frontend
│   └── src/app/
│       ├── (auth)/          # Login, register, forgot password
│       └── (dashboard)/     # 37 pages across all modules
├── scripts/                 # DB init, seeding
└── .github/workflows/       # CI + deployment
```

---

## API

**231 REST API endpoints** across 15 modules with full OpenAPI/Swagger documentation.

| Resource | URL |
|----------|-----|
| Swagger UI | [ams.14.jugaar.ai/docs](https://ams.14.jugaar.ai/docs) |
| ReDoc | [ams.14.jugaar.ai/redoc](https://ams.14.jugaar.ai/redoc) |
| Health Check | [ams.14.jugaar.ai/health](https://ams.14.jugaar.ai/health) |
| Prometheus Metrics | [ams.14.jugaar.ai/metrics](https://ams.14.jugaar.ai/metrics) |

---

## Deployment

Production instance: **[ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

| Component | Details |
|-----------|---------|
| Reverse Proxy | Nginx with SSL (Let's Encrypt, auto-renewal) |
| Backend | Uvicorn (port 8002) · systemd `ams-backend` |
| Frontend | Next.js (port 3002) · systemd `ams-frontend` |
| Database | PostgreSQL 16 · systemd `postgresql` |
| Cache / Queue | Redis + Celery worker + beat |
| Monitoring | Prometheus metrics endpoint |

### Systemd Services

```bash
systemctl status ams-backend      # Backend API
systemctl status ams-frontend     # Frontend
systemctl status ams-celery-worker  # Celery worker
systemctl status ams-celery-beat    # Celery scheduler
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `SECRET_KEY` | ✅ | JWT signing key |
| `OPENROUTER_API_KEY` | ✅ | LLM API key (OpenRouter) |
| `RESEND_API_KEY` | ✅ | Email API key (Resend) |
| `STRIPE_SECRET_KEY` | ❌ | Stripe payments (optional) |
| `ENV` | ❌ | `production` or `development` |
| `DEBUG` | ❌ | `true` or `false` (default: false) |

See [`.env.example`](.env.example) for full configuration.

---

## License

MIT — Free to self-host and modify. No per-contact fees. No vendor lock-in.
