# AssocHub — Association Management System

> A full-stack, multi-tenant Association Management System built with FastAPI, Next.js, PostgreSQL, and OpenRouter LLMs.

## 🚀 Live Demo

**🔗 [https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

| Field | Value |
|-------|-------|
| Email | `daniel.harris@example.com` |
| Password | `Demo1234!` |
| Tenant ID | `demo-association` |

## Features

| Module | Description | Endpoints |
|--------|-------------|-----------|
| 📊 Dashboard | KPIs, recent activity, AI insights, financial summary | 15 |
| 👥 Members | CRUD, groups, tags, bulk ops, CSV export, status management | 37 |
| 💰 Finances | Invoices, expenses, budgets, dues, Stripe checkout (configurable) | 37 |
| 📅 Events | Create, register, speakers, sessions, check-in, feedback | 21 |
| 📄 Documents | Upload, versioning, comments, sharing, categories | 21 |
| 🗳️ Elections | Positions, nominations, ranked-choice voting, results | 18 |
| ⚙️ Workflows | Automation engine, step editor, execution history | 16 |
| 📧 Communications | Campaigns, announcements, surveys, email logs, notifications | 36 |
| 📈 Analytics | Interactive charts (recharts), dashboards, reports, exports | 15 |
| 🤖 AI Engine | Chat, churn prediction, anomaly detection, semantic search, doc generation | 12 |
| 🔗 Integrations | Webhooks, third-party connections, event logs | 17 |

**Total: 200+ REST API endpoints across 11 modules**

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts
- **Database:** PostgreSQL 16 + pgvector (semantic search embeddings)
- **AI:** OpenRouter LLMs (configurable model — default: meta-llama/llama-3.1-8b-instruct)
  - Fallback chain: OpenRouter → Google Gemma → Groq (last resort only)
  - Built-in: RFM churn prediction, Z-score/IQR anomaly detection, vector embeddings
- **Email:** Provider abstraction (SMTP/SendGrid/SES), Jinja2 templates
- **Queue:** Celery + Redis
- **Payments:** Stripe Checkout (configurable — requires `STRIPE_SECRET_KEY`)
- **Deployment:** Nginx + SSL (Let's Encrypt) + systemd

## AI Features

| Feature | Description |
|---------|-------------|
| 💬 Chat Assistant | Natural language queries against your association data (OpenRouter) |
| 📉 Churn Prediction | RFM-based scoring identifies at-risk members |
| ⚠️ Anomaly Detection | Z-score and IQR analysis for financial/attendance anomalies |
| 🔎 Semantic Search | pgvector embeddings for meaning-based document search |
| 📝 Document Generation | LLM-assisted document creation from templates |
| 💡 Insights Engine | Cross-module analysis with severity ranking |

## Quick Start

```bash
# 1. Clone
git clone git@github.com:tahiralatif/Association-Management-System.git
cd Association-Management-System

# 2. Copy environment
cp .env.example .env
# Edit .env with your database, OpenRouter API key, SMTP credentials

# 3. Start infra
docker-compose up -d postgres redis

# 4. Setup backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py

# 5. Setup frontend
cd ../frontend
npm install
npm run dev

# 6. Open
# Frontend: http://localhost:3000
# Backend API: http://localhost:8002/docs
```

## Project Structure

```
Association-Management-System/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── core/        # Auth, email, LLM, middleware, reports
│   │   ├── modules/     # 11 feature modules
│   │   │   ├── members/
│   │   │   ├── finances/
│   │   │   ├── events/
│   │   │   ├── documents/
│   │   │   ├── elections/
│   │   │   ├── workflows/
│   │   │   ├── communications/ (+ notifications)
│   │   │   ├── analytics/
│   │   │   ├── ai/
│   │   │   └── integrations/
│   │   └── tasks/       # Celery tasks
│   ├── alembic/         # Database migrations
│   └── templates/emails/ # Jinja2 email templates
├── frontend/            # Next.js frontend
│   └── src/app/
│       ├── (auth)/      # Login, Register
│       └── (dashboard)/ # All dashboard pages (22 routes)
├── docs/                # Documentation
├── scripts/             # DB init, seeding
├── infra/               # Terraform, K8s configs
└── docker-compose.yml
```

## API Documentation

200+ REST API endpoints. Interactive docs available at:

- **Swagger UI:** [https://ams.14.jugaar.ai/docs](https://ams.14.jugaar.ai/docs)
- **ReDoc:** [https://ams.14.jugaar.ai/redoc](https://ams.14.jugaar.ai/redoc)

## Deployment

Production instance: **[https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

| Component | Details |
|-----------|---------|
| Web Server | Nginx (reverse proxy) |
| SSL | Let's Encrypt (auto-renewal via certbot) |
| Backend | Uvicorn on port 8002 (systemd: `ams-backend`) |
| Frontend | Next.js on port 3002 (systemd: `ams-frontend`) |
| Database | PostgreSQL on default port |
| Cache/Queue | Redis + Celery |

## License

MIT — Free to self-host. No per-contact fees.
