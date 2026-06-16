#!/bin/sh
# Smart ERP Next — Reset development environment
# Usage: ./scripts/reset-dev.sh
set -e

echo "Stopping services..."
docker compose down

echo "Removing volumes (data will be lost)..."
docker volume rm smart-erp-next_postgres_data 2>/dev/null || true

echo "Starting fresh..."
docker compose up -d

echo ""
echo "Waiting for API to be ready..."
until curl -s -o /dev/null http://localhost:3456/health; do
  sleep 2
done
echo "API ready at http://localhost:3456"
echo "Web ready at http://localhost:3457"
echo "Login: admin@smarterp.vn / admin123"
