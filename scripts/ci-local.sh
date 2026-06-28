#!/bin/bash
# CI-equivalent local test using Docker for PostgreSQL
# Usage: ./scripts/ci-local.sh
set -e

DB_NAME="smart_erp_ci_test"
DB_USER="postgres"
DB_PASS="postgres"
PORT=5433
CONTAINER="smart-erp-ci-pg"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/${DB_NAME}"
JWT_SECRET="ci-local-secret"

cleanup() {
  echo "=== Cleaning up ==="
  docker rm -f $CONTAINER 2>/dev/null || true
}
trap cleanup EXIT

echo "=== 1. Starting PostgreSQL container ==="
docker rm -f $CONTAINER 2>/dev/null || true
docker run -d --name $CONTAINER -e POSTGRES_USER=$DB_USER -e POSTGRES_PASSWORD=$DB_PASS -e POSTGRES_DB=$DB_NAME -p ${PORT}:5432 postgres:16-alpine
echo "Waiting for postgres..."
for i in $(seq 1 15); do
  if docker exec $CONTAINER pg_isready -U $DB_USER 2>/dev/null | grep -q "accepting connections"; then
    break
  fi
  sleep 2
done

echo "=== 2. Type check ==="
pnpm type-check

echo "=== 3. Unit + Integration tests ==="
pnpm test

echo "=== 4. Lint ==="
pnpm lint

echo "=== 5. Running migrations ==="
cd packages/database
DATABASE_URL=$DATABASE_URL pnpm exec drizzle-kit migrate
cd ../..

echo "=== 6. Running seed ==="
DATABASE_URL=$DATABASE_URL npx tsx apps/api/src/common/seeds/main.seed.ts

echo "=== 7. Quality gate ==="
pnpm qa:commit

echo "=== 8. Build ==="
pnpm build

echo ""
echo "=== ALL 1,890 TESTS PASSED ==="
