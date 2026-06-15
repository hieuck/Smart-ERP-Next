#!/bin/sh
# Smart ERP Next — Database Backup
# Usage: ./scripts/backup.sh [output-dir]
set -e

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

DB_URL="${DATABASE_URL:-postgresql://smart_erp:smart_erp@localhost:5432/smart_erp}"

echo "Backing up database to $BACKUP_DIR/backup_$TIMESTAMP.sql"
pg_dump "$DB_URL" > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only last 7 days
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "Done: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
