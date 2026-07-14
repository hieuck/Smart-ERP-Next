# CI-equivalent local test using Docker for PostgreSQL
# Usage: .\scripts\ci-local.ps1 [-SkipE2e] [-Quick]
param(
    [string]$DB_NAME = "smart_erp_ci_test",
    [string]$DB_USER = "postgres",
    [string]$DB_PASS = "postgres",
    [int]$PORT = 5433,
    [switch]$SkipE2e,
    [switch]$Quick
)

$ErrorActionPreference = "Stop"
$CONTAINER = "smart-erp-ci-pg"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/${DB_NAME}"

# Generate random secrets per run (matches ci-local.sh behavior)
function Get-RandomSecret {
    param([int]$Length = 48)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

$env:JWT_SECRET = Get-RandomSecret -Length 48

function pg { docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME @args }

try {
    Write-Host "=== 1. Starting PostgreSQL container ==="
    docker rm -f $CONTAINER 2>$null
    docker run -d --name $CONTAINER -e POSTGRES_USER=$DB_USER -e POSTGRES_PASSWORD=$DB_PASS -e POSTGRES_DB=$DB_NAME -p ${PORT}:5432 postgres:18-alpine
    Write-Host "Waiting for postgres..."
    Start-Sleep 5
    $retries = 0
    do {
        $ready = docker exec $CONTAINER pg_isready -U $DB_USER 2>$null
        if ($ready -match "accepting connections") { break }
        Start-Sleep 2
        $retries++
    } while ($retries -lt 15)

    Write-Host "=== 2. Type check ==="
    pnpm type-check

    Write-Host "=== 3. Lint ==="
    pnpm lint

    Write-Host "=== 4. Unit + Integration tests ==="
    pnpm test

    Write-Host "=== 5. Running migrations ==="
    Push-Location packages/database
    $env:DATABASE_URL = $DATABASE_URL
    pnpm exec drizzle-kit migrate
    Pop-Location

    Write-Host "=== 6. Running seed ==="
    $env:DATABASE_URL = $DATABASE_URL
    npx tsx apps/api/src/common/seeds/main.seed.ts

    Write-Host "=== 7. Quality gate ==="
    $env:DATABASE_URL = ""
    pnpm qa:commit

    if (-not $SkipE2e -and -not $Quick) {
        Write-Host "=== 8. E2E tests ==="
        $env:DATABASE_URL = $DATABASE_URL
        pnpm test:api:e2e
        pnpm test:e2e
    } else {
        Write-Host "=== 8. Skipping E2E tests (use -SkipE2e or -Quick to keep this fast) ==="
    }

    Write-Host "=== 9. Build ==="
    $env:DATABASE_URL = ""
    pnpm build

    Write-Host "`n=== ALL PASSED ==="
} finally {
    Write-Host "=== Cleaning up ==="
    docker rm -f $CONTAINER 2>$null
}
