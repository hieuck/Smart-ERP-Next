# CI-equivalent local test: fresh DB → migrate → seed → test → build
# Usage: .\scripts\ci-local.ps1
param(
    [string]$DB_NAME = "smart_erp_ci_test",
    [string]$DB_USER = "postgres",
    [string]$DB_PASS = "postgres",
    [int]$PORT = 5432
)

$ErrorActionPreference = "Stop"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/${DB_NAME}"
$env:JWT_SECRET = "ci-local-secret"

Write-Host "=== 1. Creating fresh database ==="
& psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>$null
& psql -U postgres -c "CREATE DATABASE ${DB_NAME};"

Write-Host "=== 2. Running migrations ==="
Push-Location packages/database
$env:DATABASE_URL = $DATABASE_URL
pnpm exec drizzle-kit migrate
Pop-Location

Write-Host "=== 3. Running seed ==="
$env:DATABASE_URL = $DATABASE_URL
npx tsx apps/api/src/common/seeds/main.seed.ts

Write-Host "=== 4. Quality gate ==="
$env:DATABASE_URL = ""
pnpm qa:commit

Write-Host "=== 5. E2E tests ==="
$env:DATABASE_URL = $DATABASE_URL
pnpm test:e2e

Write-Host "=== 6. Build ==="
$env:DATABASE_URL = ""
pnpm build

Write-Host "`n=== ALL PASSED ==="
