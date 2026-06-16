#!/bin/bash
# CI-equivalent local test: fresh DB → migrate → seed → test → build
# Usage: ./scripts/ci-local.sh
set -e

DB_NAME="smart_erp_ci_test"
DB_USER="postgres"
DB_PASS="postgres"
PORT="5432"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/${DB_NAME}"
JWT_SECRET="ci-local-secret"

echo "=== 1. Creating fresh database ==="
psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
psql -U postgres -c "CREATE DATABASE ${DB_NAME};"

echo "=== 2. Running migrations ==="
cd packages/database
DATABASE_URL=$DATABASE_URL pnpm exec drizzle-kit migrate
cd ../..

echo "=== 3. Running seed ==="
DATABASE_URL=$DATABASE_URL npx tsx apps/api/src/common/seeds/main.seed.ts

echo "=== 4. Quality gate ==="
pnpm qa:commit

echo "=== 5. E2E tests ==="
DATABASE_URL=$DATABASE_URL JWT_SECRET=$JWT_SECRET pnpm test:e2e

echo "=== 6. Build ==="
pnpm build

echo ""
echo "=== ALL PASSED ==="
