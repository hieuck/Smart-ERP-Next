#!/bin/sh
set -e

echo "============================================"
echo "  Smart ERP Next — Starting..."
echo "============================================"

# ── Required secrets ──────────────────────────────────────
# The container must have JWT_SECRET and API_KEY_HMAC_SECRET to start.
# For zero-config demos, generate cryptographically random defaults when they
# are not supplied. In production, always pass strong, persistent secrets.
generate_secret() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET=$(generate_secret)
  export JWT_SECRET
  echo "WARNING: JWT_SECRET not provided; a random demo secret was generated."
fi

if [ -z "${API_KEY_HMAC_SECRET:-}" ]; then
  API_KEY_HMAC_SECRET=$(generate_secret)
  export API_KEY_HMAC_SECRET
  echo "WARNING: API_KEY_HMAC_SECRET not provided; a random demo secret was generated."
fi

# ── Database ──────────────────────────────────────────────
if [ -n "$DATABASE_URL" ]; then
  echo "Using external database: $DATABASE_URL"
else
  echo "Starting embedded PostgreSQL..."
  PGDATA="${PGDATA:-/var/lib/postgresql/data}"

    # Check if PostgreSQL is already running
    if su - postgres -c "pg_isready -U postgres" 2>/dev/null; then
      echo "PostgreSQL already running"
    else
      if [ ! -f "$PGDATA/PG_VERSION" ]; then
        echo "Initializing PostgreSQL database (this may take 10-30s on first run)..."
        su - postgres -c "initdb -D '$PGDATA'"
      fi

      echo "Starting PostgreSQL..."
      su - postgres -c "pg_ctl -D '$PGDATA' -o '-p 5432' -l /tmp/pg.log start" || {
        echo "ERROR: PostgreSQL failed to start. Check log:"
        su - postgres -c "cat /tmp/pg.log" 2>/dev/null || true
        exit 1
      }

      echo "Waiting for PostgreSQL..."
      TIMEOUT=30
      while ! su - postgres -c "pg_isready -U postgres" 2>/dev/null; do
        TIMEOUT=$((TIMEOUT - 1))
        if [ $TIMEOUT -le 0 ]; then
          echo "ERROR: PostgreSQL not ready after 30s. Log:"
          su - postgres -c "cat /tmp/pg.log" 2>/dev/null || true
          exit 1
        fi
        sleep 1
      done

      # Create database if not exists
      su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='smart_erp'\" | grep -q 1 || createdb smart_erp" 2>/dev/null || true
    fi

  DATABASE_URL="postgresql://postgres@localhost:5432/smart_erp"
  export DATABASE_URL
  echo "PostgreSQL ready at $DATABASE_URL"
fi

# ── Migrations ────────────────────────────────────────────
DRIZZLE_KIT="/app/node_modules/.bin/drizzle-kit"
if [ -f "$DRIZZLE_KIT" ]; then
  echo "Running migrations..."
  cd /app/packages/database
  DATABASE_URL="$DATABASE_URL" node "$DRIZZLE_KIT" migrate 2>&1 || echo "Migration issue (non-fatal)"
  cd /app
fi

# ── Seed ──────────────────────────────────────────────────
if [ -f "apps/api/dist/apps/api/src/common/seeds/main.seed.js" ]; then
  echo "Checking demo data..."
  USER_COUNT=$(node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query(\"SELECT COUNT(*)::int as cnt FROM users WHERE email = 'admin@smarterp.vn'\")
      .then(r => { console.log(r.rows[0].cnt); pool.end(); })
      .catch(() => { console.log('0'); pool.end(); });
  " 2>/dev/null || echo "0")

  if [ "$USER_COUNT" = "0" ]; then
    echo "Seeding demo data..."
    node apps/api/dist/apps/api/src/common/seeds/main.seed.js && echo "Demo data seeded" || echo "Seed warning (non-fatal)"
  else
    echo "Database already has data, skipping seed"
  fi
fi

# ── Start servers ─────────────────────────────────────────
echo "Starting API server on port ${PORT:-3456}..."
node apps/api/dist/apps/api/src/main.js &

if [ -f "apps/web/.next/standalone/server.js" ]; then
  echo "Starting Web server on port ${WEB_PORT:-3457}..."
  cd apps/web && PORT="${WEB_PORT:-3457}" node .next/standalone/server.js &
  cd /app
elif [ -f "apps/web/.next/standalone/apps/web/server.js" ]; then
  echo "Starting Web server (monorepo) on port ${WEB_PORT:-3457}..."
  cd apps/web && PORT="${WEB_PORT:-3457}" HOSTNAME="0.0.0.0" node .next/standalone/apps/web/server.js &
  cd /app
fi

echo "============================================"
echo "  API: http://localhost:${PORT:-3456}"
echo "  Web: http://localhost:${WEB_PORT:-3457}"
echo "  Login: admin@smarterp.vn / admin123"
echo "============================================"

# Wait for ALL background processes. If one crashes, restart it.
# Prevents container exit when web server has transient issues.
while true; do
  wait -n
  CODE=$?
  # If the API master process dies, exit container (fatal)
  if ! kill -0 $(jobs -p) 2>/dev/null; then
    echo "API process died (code $CODE). Shutting down."
    exit $CODE
  fi
  echo "Web server restarted (code $CODE). Respawn in 2s..."
  sleep 2
  # Re-spawn web server
  if [ -f "apps/web/.next/standalone/apps/web/server.js" ]; then
    cd apps/web && PORT="${WEB_PORT:-3457}" HOSTNAME="0.0.0.0" node --max-old-space-size=512 .next/standalone/apps/web/server.js &
    cd /app
  fi
done
