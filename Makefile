.PHONY: help setup dev test lint migrate seed docker-up docker-down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Initial setup (install deps, create .env)
	cp .env.example .env
	cd backend && uv sync
	cd frontend && npm install

dev: ## Start development (infra + services)
	docker-compose up -d postgres redis meilisearch minio
	cd backend && uvicorn app.main:app --reload &
	cd frontend && npm run dev &

test: ## Run all tests
	cd backend && pytest -v

lint: ## Lint code
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint

format: ## Format code
	cd backend && ruff check --fix . && ruff format .
	cd frontend && npm run format

migrate: ## Run database migrations
	cd backend && alembic upgrade head

migrate-new: ## Create a new migration
	cd backend && alembic revision --autogenerate -m "$(msg)"

seed: ## Seed demo data
	cd backend && python scripts/seed.py

docker-up: ## Start all services with Docker
	docker-compose up -d

docker-down: ## Stop all services
	docker-compose down

docker-logs: ## View logs
	docker-compose logs -f

clean: ## Clean up
	docker-compose down -v
	rm -rf backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/.next frontend/node_modules
