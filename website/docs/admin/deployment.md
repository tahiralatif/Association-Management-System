---
sidebar_position: 31
title: Deployment
---

# Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   nginx     │────▶│  Next.js     │────▶│  FastAPI     │
│  (proxy)    │     │  (port 3002) │     │  (port 8002) │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    │            │            │
                              ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
                              │ PostgreSQL│ │ Redis │ │  Celery   │
                              │  (5432)   │ │ (6379)│ │  Workers  │
                              └───────────┘ └───────┘ └───────────┘
```

## Services

| Service | Port | Description |
|---|---|---|
| nginx | 80/443 | Reverse proxy, SSL termination |
| ams-frontend | 3002 | Next.js 16 application |
| ams-backend | 8002 | FastAPI application |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache, session store, Celery broker |
| Celery | — | Background task workers |

## Systemd Services

```bash
# Start services
sudo systemctl start ams-frontend
sudo systemctl start ams-backend

# Stop services
sudo systemctl stop ams-frontend
sudo systemctl stop ams-backend

# Restart services
sudo systemctl restart ams-frontend
sudo systemctl restart ams-backend

# Check status
sudo systemctl status ams-frontend
sudo systemctl status ams-backend
```

## Environment Variables

### Backend (`.env`)

```bash
DATABASE_URL=postgresql://assochub:***@localhost:5432/assochub
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
GROQ_API_KEY=gsk_your-groq-key
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
ENVIRONMENT=development
DEBUG=true
```

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8002
NEXT_PUBLIC_APP_NAME=AssocHub
```

## Database Setup

```bash
# Create database
createdb assochub

# Create user
psql -c "CREATE USER assochub WITH PASSWORD 'your-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE assochub TO assochub;"

# Run migrations
cd backend && alembic upgrade head
```

## Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis

# Test connection
redis-cli ping
# Expected: PONG
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

## Production Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure Redis persistence
- [ ] Enable rate limiting
- [ ] Set CORS origins
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Test health endpoint
