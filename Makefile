.PHONY: help setup dev up down db-migrate db-seed test test-workers test-server test-client worker-daemon worker-cycle build lint clean

help:
	@echo "Himalaya Flood & GLOF Early Warning System (EWS)"
	@echo "================================================"
	@echo "make setup         - Install dependencies across workers, server, and client"
	@echo "make dev           - Run all services locally via docker-compose"
	@echo "make up            - Start background docker containers"
	@echo "make down          - Stop all docker containers"
	@echo "make db-migrate    - Apply PostGIS migrations"
	@echo "make db-seed       - Ingest ICIMOD PDGL GeoJSON seed dataset"
	@echo "make test          - Run all test suites across modules"
	@echo "make test-workers  - Run Python worker pytest suite"
	@echo "make test-server   - Run Node.js API test suite"
	@echo "make test-client   - Run Client tests/type-check"
	@echo "make worker-daemon - Start background satellite & weather ingestion daemon"
	@echo "make worker-cycle  - Run a single satellite & weather ingestion pass"
	@echo "make lint          - Run linters across python and typescript codebases"
	@echo "make clean         - Remove temporary build artifacts and caches"

setup:
	@echo "Setting up Python workers environment..."
	cd workers && python3 -m venv venv && ./venv/bin/pip install --upgrade pip && ./venv/bin/pip install -r requirements.txt
	@echo "Setting up Server dependencies..."
	cd server && npm install
	@echo "Setting up Client dependencies..."
	cd client && npm install

dev:
	docker-compose up --build

up:
	docker-compose up -d

down:
	docker-compose down

db-migrate:
	@echo "Applying database migrations to PostGIS..."
	psql "$${DATABASE_URL:-postgresql://ews_admin:ews_secure_password@localhost:5435/himalaya_ews}" -f database/migrations/001_enable_postgis.sql
	psql "$${DATABASE_URL:-postgresql://ews_admin:ews_secure_password@localhost:5435/himalaya_ews}" -f database/migrations/002_create_basins_and_lakes.sql
	psql "$${DATABASE_URL:-postgresql://ews_admin:ews_secure_password@localhost:5435/himalaya_ews}" -f database/migrations/003_create_observations_and_alerts.sql
	psql "$${DATABASE_URL:-postgresql://ews_admin:ews_secure_password@localhost:5435/himalaya_ews}" -f database/migrations/004_create_insar_and_edge_sensors.sql
	psql "$${DATABASE_URL:-postgresql://ews_admin:ews_secure_password@localhost:5435/himalaya_ews}" -f database/migrations/005_add_utm_projected_area_and_mvt.sql

simulate-drill:
	@echo "Running Multi-Tiered GLOF Simulation Drill..."
	cd workers && ./venv/bin/python3 ../scripts/simulate_glof_escalation.py


db-seed:
	@echo "Seeding ICIMOD PDGL GeoJSON dataset..."
	cd workers && ./venv/bin/python3 -m src.ingestion.seed_db

test: test-workers test-server test-client

test-workers:
	@echo "Running Python worker tests..."
	cd workers && ./venv/bin/pytest tests/ -v

test-server:
	@echo "Running Node.js server tests..."
	cd server && npm test

test-client:
	@echo "Type checking client application..."
	cd client && npm run type-check

worker-daemon:
	@echo "Starting Ingestion Daemon..."
	cd workers && ./venv/bin/python3 -m src.ingestion.scheduler

worker-cycle:
	@echo "Running single satellite ingestion pass..."
	cd workers && ./venv/bin/python3 -m src.ingestion.scheduler --run-once

lint:
	cd workers && ./venv/bin/flake8 src/ tests/ || true
	cd server && npm run lint || true
	cd client && npm run lint || true

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".next" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +
