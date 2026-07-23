# AssocHub — Association Management System

> A full-stack, multi-tenant Association Management System built with FastAPI, Next.js, PostgreSQL, and Groq AI.

## 🚀 Live Demo

**🔗 [https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

| Field | Value |
|-------|-------|
| Email | `daniel.harris@example.com` |
| Password | `demo1234` |
| Tenant ID | `demo-association` |

## Features

| Module | Description |
|--------|-------------|
| 📊 Dashboard | KPIs, recent activity, AI insights, financial summary |
| 👥 Members | CRUD, groups, tags, bulk ops, CSV export, status management |
| 💰 Finances | Invoices, expenses, budgets, dues, Stripe checkout |
| 📅 Events | Create, register, speakers, sessions, check-in, feedback |
| 📄 Documents | Upload, versioning, comments, sharing, categories |
| 🗳️ Elections | Positions, nominations, voting, results |
| ⚙️ Workflows | Automation engine, step editor, execution history |
| 📧 Communications | Campaigns, announcements, surveys, email logs |
| 📈 Analytics | Interactive charts (recharts), dashboards, reports, exports |
| 🤖 AI Assistant | Groq-powered chat with live database context |
| 🔗 Integrations | Webhooks, third-party connections, event logs |

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts
- **Database:** PostgreSQL 16 + pgvector
- **AI:** Groq LLM (`llama-3.3-70b-versatile`) for chat & document generation
- **Email:** Provider abstraction (SMTP/SendGrid/SES), Jinja2 templates
- **Queue:** Celery + Redis
- **Deployment:** Nginx + SSL (Let's Encrypt) + systemd

## Quick Start

```bash
# 1. Clone
git clone git@github.com:tahiralatif/Association-Management-System.git
cd Association-Management-System

# 2. Copy environment
cp .env.example .env
# Edit .env with your database, Groq API key, SMTP credentials

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
│   │   ├── modules/     # 9 feature modules
│   │   │   ├── members/
│   │   │   ├── finances/
│   │   │   ├── events/
│   │   │   ├── documents/
│   │   │   ├── elections/
│   │   │   ├── workflows/
│   │   │   ├── communications/
│   │   │   ├── analytics/
│   │   │   ├── ai/
│   │   │   └── integrations/
│   │   └── tasks/       # Celery tasks
│   ├── alembic/         # Database migrations
│   └── templates/emails/ # Jinja2 email templates
├── frontend/            # Next.js frontend
│   └── src/app/
│       ├── (auth)/      # Login, Register
│       └── (dashboard)/ # All dashboard pages
├── docs/                # Documentation
├── scripts/             # DB init, seeding
├── infra/               # Terraform, K8s configs
└── docker-compose.yml
```

## API Endpoints

199+ REST API endpoints across all modules. Interactive docs available at:

- **Swagger UI:** [https://ams.14.jugaar.ai/docs](https://ams.14.jugaar.ai/docs)
- **ReDoc:** [https://ams.14.jugaar.ai/redoc](https://ams.14.jugaar.ai/redoc)

## Deployment

The production instance is deployed at **[https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

- **Web Server:** Nginx (reverse proxy)
- **SSL:** Let's Encrypt (auto-renewal via certbot)
- **Process Manager:** systemd services (`ams-backend`, `ams-frontend`)
- **Backend:** Uvicorn on port 8002
- **Frontend:** Next.js on port 3002
- **Database:** PostgreSQL on default port
