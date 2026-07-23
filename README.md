# AssocHub — Association Management System

## Quick Start

```bash
# 1. Copy environment
cp .env.example .env

# 2. Start everything
docker-compose up -d

# 3. Run migrations
cd backend && alembic upgrade head

# 4. Seed demo data
python scripts/seed.py

# 5. Open
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/api/docs
```

## Development

```bash
# Start infra only
docker-compose up -d postgres redis meilisearch minio

# Backend (in another terminal)
cd backend
uv sync
uvicorn app.main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Project Structure

```
assochub/
├── backend/          # Python FastAPI application
│   ├── app/          # Application code
│   │   ├── core/     # Auth, tenant, middleware
│   │   ├── modules/  # Feature modules
│   │   ├── ai/       # AI engine
│   │   └── plugins/  # Plugin system
│   └── alembic/      # Database migrations
├── frontend/         # Next.js application
├── infra/            # Infrastructure (Terraform, K8s)
└── docs/             # Documentation
```

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic
- **Frontend:** Next.js 15, TypeScript, shadcn/ui
- **Database:** PostgreSQL 16 + pgvector
- **Cache:** Redis 7
- **Search:** Meilisearch
- **Storage:** MinIO (S3-compatible)
- **Queue:** Celery + Redis
