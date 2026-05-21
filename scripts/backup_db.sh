#!/bin/bash
# ==============================================================================
# Smart ERP Next - Automated Database Backup Script
# ==============================================================================
# - Chạy file này bằng Cron job: 0 0,12 * * * /path/to/backup_db.sh
# - Lưu ý: Tự động nén GZIP và xóa file cũ hơn 7 ngày

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="smart-erp-postgres"
DB_USER="smart_erp"
DB_NAME="smart_erp"
FILE_NAME="backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "================================================================="
echo "🔄 Bắt đầu tiến trình Sao lưu Cơ sở dữ liệu (Database Backup)..."
echo "================================================================="

# Tạo thư mục nếu chưa có
mkdir -p "$BACKUP_DIR"

# Chạy pg_dump xuyên qua Docker và đẩy vào luồng nén GZIP
echo "📦 Đang trích xuất dữ liệu từ Container [$DB_CONTAINER]..."
docker exec -t $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME -c | gzip > "$BACKUP_DIR/$FILE_NAME"

echo "✅ Đã sao lưu thành công: $BACKUP_DIR/$FILE_NAME"

# Xóa các file backup cũ hơn 7 ngày để tránh đầy ổ cứng (Rotational Backup)
echo "🧹 Đang dọn dẹp các bản sao lưu cũ hơn 7 ngày..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;

echo "✅ Hoàn tất Quy trình Sao lưu Thảm họa!"
echo "================================================================="
