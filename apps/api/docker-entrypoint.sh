#!/bin/sh
set -e

# Run migrations on every start (idempotent)
if [ -d "packages/database/drizzle" ]; then
  echo "Running drizzle migrations..."
  npx drizzle-kit migrate --config=packages/database/drizzle.config.ts 2>/dev/null || true
fi

# Seed demo data if DB is empty (no users)
if [ "$SKIP_SEED" != "1" ]; then
  HAS_USERS=$(node -e "const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query('SELECT 1 FROM users LIMIT 1').then(r => { process.exit(r.rows.length ? 0 : 1); }).catch(() => process.exit(1));" 2>/dev/null; echo $?)
  if [ "$HAS_USERS" = "1" ]; then
    echo "Seeding demo data..."
    node -e "
      const { Pool } = require('pg');
      const bcrypt = require('bcrypt');
      const p = new Pool({ connectionString: process.env.DATABASE_URL });
      (async () => {
        const hash = await bcrypt.hash('demo123456', 10);
        const tenant = await p.query(\"INSERT INTO tenants (id, name, slug) VALUES (gen_random_uuid(), 'Demo Company', 'demo') RETURNING id\");
        const tid = tenant.rows[0].id;
        await p.query(\"INSERT INTO users (id, email, name, password_hash, tenant_id, role) VALUES (gen_random_uuid(), 'admin@demo.smarterp.vn', 'Admin', '\$1', '\$2', 'admin')\", [hash, tid]);
        await p.query(\"INSERT INTO users (id, email, name, password_hash, tenant_id, role) VALUES (gen_random_uuid(), 'admin@smarterp.vn', 'Super Admin', '\$1', '\$2', 'admin')\", [hash, tid]);
        console.log('Demo data seeded');
        await p.end();
      })().catch(e => { console.error('Seed error:', e.message); process.exit(0); });
    "
  fi
fi

echo "Starting API server..."
exec node apps/api/dist/apps/api/src/main.js
