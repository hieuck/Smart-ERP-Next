#!/bin/sh
set -e

echo "============================================"
echo "  Smart ERP Next — Starting..."
echo "============================================"

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  if command -v npx >/dev/null 2>&1 && [ -f "packages/database/drizzle.config.ts" ]; then
    echo "Running database migrations..."
    npx drizzle-kit migrate --config=packages/database/drizzle.config.ts || echo "⚠️  Migration failed"
  fi

  # Auto-seed demo data if database is empty
  if command -v node >/dev/null 2>&1 && [ -f "apps/api/dist/apps/api/src/common/seeds/main.seed.js" ]; then
    USER_COUNT=$(node -e "
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      pool.query('SELECT COUNT(*)::int as cnt FROM users WHERE email = \$1', ['admin@smarterp.vn'])
        .then(r => { console.log(r.rows[0].cnt); pool.end(); })
        .catch(() => { console.log('0'); pool.end(); });
    " 2>/dev/null || echo "0")

    if [ "$USER_COUNT" = "0" ]; then
      echo "Seeding demo data..."
      node apps/api/dist/apps/api/src/common/seeds/main.seed.js && echo "Demo data seeded" || echo "⚠️  Seed failed"
    else
      echo "Database already populated, skipping seed"
    fi
  fi
else
  echo ""
  echo "============================================"
  echo "  ⚠️  DATABASE_URL not set"
  echo ""
  echo "  Quick start with PostgreSQL:"
  echo "    docker run -d --name smart-erp-postgres \\"
  echo "      -e POSTGRES_USER=smart_erp \\"
  echo "      -e POSTGRES_PASSWORD=smart_erp \\"
  echo "      -e POSTGRES_DB=smart_erp \\"
  echo "      postgres:16-alpine"
  echo ""
  echo "  Then run this container with:"
  echo "    docker run -d --name smart-erp-app \\"
  echo "      -p 3456:3456 -p 3457:3457 \\"
  echo "      -e DATABASE_URL=postgresql://smart_erp:smart_erp@\\$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' smart-erp-postgres):5432/smart_erp \\"
  echo "      ghcr.io/hieuck/smart-erp-next:latest"
  echo ""
  echo "  Or simpler: use docker compose"
  echo "    docker compose up -d"
  echo "============================================"
  echo ""
fi

# Start API server
echo "Starting API server on port ${PORT:-3456}..."
node apps/api/dist/apps/api/src/main.js &

# Start Web server if present
if [ -f "apps/web/.next/standalone/server.js" ]; then
  echo "Starting Web server (standalone) on port ${WEB_PORT:-3457}..."
  cd apps/web && PORT="${WEB_PORT:-3457}" node .next/standalone/server.js &
  cd /app
elif [ -f "apps/web/.next/standalone/apps/web/server.js" ]; then
  echo "Starting Web server (standalone, monorepo path) on port ${WEB_PORT:-3457}..."
  cd apps/web && PORT="${WEB_PORT:-3457}" node .next/standalone/apps/web/server.js &
  cd /app
elif [ -f "apps/web/node_modules/.bin/next" ] && [ -d "apps/web/.next" ]; then
  echo "Starting Web server (next start) on port ${WEB_PORT:-3457}..."
  cd apps/web && PORT="${WEB_PORT:-3457}" node_modules/.bin/next start &
  cd /app
fi

echo "============================================"
echo "  API: http://localhost:${PORT:-3456}"
echo "  Web: http://localhost:${WEB_PORT:-3457}"
echo "  Login: admin@smarterp.vn / admin123"
echo "============================================"

# Wait for any child to exit
wait -n
exit $?
