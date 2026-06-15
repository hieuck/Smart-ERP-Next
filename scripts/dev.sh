#!/bin/sh
# Smart ERP Next — Local Development
# Usage: ./scripts/dev.sh
set -e

# Auto-create .env from example if missing
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Start PostgreSQL via Docker if not already running
if ! docker compose ps postgres --format '{{.Status}}' 2>/dev/null | grep -q "healthy"; then
  echo "Starting PostgreSQL via Docker..."
  docker compose up -d postgres
  echo "Waiting for PostgreSQL to be ready..."
  until docker compose exec postgres pg_isready -U smart_erp 2>/dev/null; do
    sleep 2
  done
  echo "PostgreSQL ready"
fi

# Run database migrations
echo "Running migrations..."
DATABASE_URL="postgresql://smart_erp:smart_erp@localhost:5432/smart_erp" \
  pnpm --filter @smart-erp/database migrate

# Start dev servers (API + Web via Turbo)
echo "Starting dev servers..."
pnpm dev
