#!/usr/bin/env pwsh
# Smart ERP Next - Deploy Script
Write-Host "Building Smart ERP Next..." -ForegroundColor Cyan

# Clone repo if needed

# Clone repository (replace URL with actual)
if (-Not (Test-Path .git)) { git clone https://github.com/hieuck/Smart-ERP-Next.git . }

Write-Host "Installing dependencies..." -ForegroundColor Yellow
cd ..
cd smart-erp-next

if (-Not (Test-Path .env)) { Copy-Item .env.example .env }

Write-Host "Starting Docker setup..." -ForegroundColor Green

if (Test-Path .github/workflows/release.yml) { echo "Release workflow found!" }

Write-Host "Setup complete!" -ForegroundColor Green

# Build project
pnpm install --frozen-lockfile
pnpm build

# Start Docker containers
docker compose up -d --build

Write-Host "
Web Dashboard: http://localhost:3001
API Swagger: http://localhost:3000/api
AI Service: http://localhost:8000
