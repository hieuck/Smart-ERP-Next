import re

# 1. Fix Dockerfile - remove CJS wrapper
with open('/app/Dockerfile', 'r') as f:
    content = f.read()

# Remove the CJS wrapper generation line
lines = content.split('\n')
new_lines = []
for line in lines:
    if 'Auto-generated CJS wrapper' in line:
        continue
    if 'const m = require' in line and 'export = m' in line:
        continue
    new_lines.append(line)

with open('/app/Dockerfile', 'w') as f:
    f.write('\n'.join(new_lines))
print('Dockerfile: cleaned up CJS wrapper')

# 2. Fix entrypoint
with open('/app/apps/api/docker-entrypoint.sh', 'r') as f:
    content = f.read()

# Replace the migration section
old_migrate = '''DRIZZLE_KIT="/app/node_modules/.bin/drizzle-kit"
DRIZZLE_DIR="/app/packages/database"
if [ -f "$DRIZZLE_KIT" ] && [ -f "$DRIZZLE_DIR/drizzle.config.ts" ]; then
  echo "Running migrations..."
  (cd "$DRIZZLE_DIR" && DATABASE_URL="$DATABASE_URL" node "$DRIZZLE_KIT" migrate) || echo "Migration issue (non-fatal)"
fi'''

new_migrate = '''DRIZZLE_KIT="/app/node_modules/.bin/drizzle-kit"
DRIZZLE_CONFIG="packages/database/drizzle.config.ts"
if [ -f "$DRIZZLE_KIT" ] && [ -f "$DRIZZLE_CONFIG" ]; then
  echo "Running migrations..."
  cd /app && node "$DRIZZLE_KIT" migrate --config="$DRIZZLE_CONFIG" || echo "Migration issue (non-fatal)"
fi'''

content = content.replace(old_migrate, new_migrate)

# Remove --experimental-require-module
content = content.replace('--experimental-require-module ', '')

with open('/app/apps/api/docker-entrypoint.sh', 'w') as f:
    f.write(content)
print('entrypoint: reverted migration + removed experimental flag')
print('Done')
