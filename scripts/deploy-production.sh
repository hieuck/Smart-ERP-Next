#!/bin/bash

# Smart ERP Next Production Deployment Script
# Usage: ./scripts/deploy-production.sh [environment]

set -e  # Exit on error

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"

echo "🚀 Starting Smart ERP Next ${ENVIRONMENT} deployment..."
echo "Timestamp: ${TIMESTAMP}"

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo "📋 Loading ${ENVIRONMENT} environment variables..."
    export $(grep -v '^#' .env.${ENVIRONMENT} | xargs)
else
    echo "❌ Error: .env.${ENVIRONMENT} not found"
    exit 1
fi

# Validate required environment variables
REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "NEXT_PUBLIC_API_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env.${ENVIRONMENT}"
        exit 1
    fi
done

echo "✅ Environment validation passed"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
echo "📦 Backup directory created: ${BACKUP_DIR}"

# Backup existing database if running
if docker compose -f docker compose.production.yml ps postgres | grep -q "Up"; then
    echo "💾 Creating database backup..."
    docker compose -f docker compose.production.yml exec -T postgres pg_dump -U "${DB_USER:-smart_erp_prod}" smart_erp > "${BACKUP_DIR}/database_backup.sql"
    echo "✅ Database backup created: ${BACKUP_DIR}/database_backup.sql"
fi

# Stop existing services
echo "🛑 Stopping existing services..."
docker compose -f docker compose.production.yml down --remove-orphans

# Pull latest images (if using remote images)
echo "📥 Pulling latest images..."
docker compose -f docker compose.production.yml pull || true

# Build and start services
echo "🔨 Building and starting services..."
docker compose -f docker compose.production.yml up -d --build --remove-orphans

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
MAX_WAIT=300  # 5 minutes
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker compose -f docker compose.production.yml ps | grep -q "unhealthy"; then
        echo "⚠️ Some services are unhealthy, checking..."
        docker compose -f docker compose.production.yml ps
        sleep 10
        ELAPSED=$((ELAPSED + 10))
    elif docker compose -f docker compose.production.yml ps | grep -q "starting"; then
        echo "⏳ Services still starting..."
        sleep 10
        ELAPSED=$((ELAPSED + 10))
    else
        echo "✅ All services are healthy!"
        break
    fi
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "❌ Timeout waiting for services to be healthy"
    docker compose -f docker compose.production.yml logs --tail=50
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
docker compose -f docker compose.production.yml exec -T api node apps/api/dist/common/migrations/run-migrations.js

# Seed initial data if needed
if [ "$ENVIRONMENT" = "production" ] && [ ! -f "${BACKUP_DIR}/database_backup.sql" ]; then
    echo "🌱 Seeding initial data..."
    docker compose -f docker compose.production.yml exec -T api node apps/api/dist/common/seeds/main.seed.js
fi

# Health check
echo "🏥 Performing health checks..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${API_PORT:-3456}/health || echo "000")
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${WEB_PORT:-3457} || echo "000")

if [ "$API_HEALTH" = "200" ] && [ "$WEB_HEALTH" = "200" ]; then
    echo "✅ All health checks passed!"
else
    echo "❌ Health check failed: API=${API_HEALTH}, WEB=${WEB_HEALTH}"
    exit 1
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find ./backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

# Deployment summary
echo ""
echo "🎉 Deployment completed successfully!"
echo "====================================="
echo "Environment: ${ENVIRONMENT}"
echo "Timestamp: ${TIMESTAMP}"
echo ""
echo "📊 Services Status:"
docker compose -f docker compose.production.yml ps
echo ""
echo "🌐 Access URLs:"
echo "  Web Dashboard: http://localhost:${WEB_PORT:-3001}"
echo "  API Swagger: http://localhost:${API_PORT:-3000}/api"
echo "  AI Forecast: http://localhost:${AI_FORECAST_PORT:-8000}/docs"
echo ""
echo "📝 Logs:"
echo "  View logs: docker compose -f docker compose.production.yml logs -f"
echo "  API logs: docker compose -f docker compose.production.yml logs -f api"
echo "  Web logs: docker compose -f docker compose.production.yml logs -f web"
echo ""
echo "🔧 Management Commands:"
echo "  Stop: docker compose -f docker compose.production.yml down"
echo "  Restart: docker compose -f docker compose.production.yml restart"
echo "  Update: ./scripts/deploy-production.sh ${ENVIRONMENT}"
echo ""
echo "✅ Smart ERP Next is now running in ${ENVIRONMENT} mode!"