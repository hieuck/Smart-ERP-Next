#!/bin/sh
set -e

echo "============================================"
echo "  Smart ERP Next — Starting..."
echo "============================================"

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  if command -v npx >/dev/null 2>&1 && [ -f "packages/database/drizzle.config.ts" ]; then
    echo "Running database migrations..."
    npx drizzle-kit migrate --config=packages/database/drizzle.config.ts 2>/dev/null || echo "Migration skipped"
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
      node apps/api/dist/apps/api/src/common/seeds/main.seed.js 2>/dev/null && echo "Demo data seeded" || echo "Seed skipped"
    else
      echo "Database already populated, skipping seed"
    fi
  fi
else
  echo "DATABASE_URL not set, skipping migrations and seed"
fi

# Start API server
echo "Starting API server on port ${PORT:-3456}..."
node apps/api/dist/apps/api/src/main.js &

# Start Web server if present
if [ -d "apps/web/.next/standalone/apps/web" ]; then
  echo "Starting Web server (standalone) on port ${WEB_PORT:-3457}..."
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
