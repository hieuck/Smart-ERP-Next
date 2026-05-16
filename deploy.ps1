# Smart ERP Next - One Click Deployment Script (Windows)

Write-Host "🚀 Starting Smart ERP Next Deployment..." -ForegroundColor Cyan

# 1. Environment Check
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

# 2. Build Monorepo
Write-Host "📦 Building all modules (Turbo Build)..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please check logs." -ForegroundColor Red
    # exit $LASTEXITCODE
}

# 3. Docker Rollout
Write-Host "🐳 Launching Docker Containers..." -ForegroundColor Blue
docker-compose up -d --build

Write-Host "✅ Deployment Complete! System is rising at http://localhost:3001" -ForegroundColor Green
Write-Host "📊 API Documentation: http://localhost:3000/api" -ForegroundColor Green
