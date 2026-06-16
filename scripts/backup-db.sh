#!/bin/sh
set -e

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="smart_erp_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Backing up database to $BACKUP_DIR/$FILENAME..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$FILENAME"

echo "Done: $BACKUP_DIR/$FILENAME"
echo ""
echo "To restore:"
echo "  psql \$DATABASE_URL < $BACKUP_DIR/$FILENAME"
