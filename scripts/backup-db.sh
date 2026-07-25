#!/bin/bash
# Ежедневный бэкап PostgreSQL базы данных glamping
# Установка: crontab -e → 0 3 * * * /home/glamping/app/scripts/backup-db.sh >> /var/log/glamping-backup.log 2>&1

set -euo pipefail

DB_NAME="glamping"
DB_USER="glamping"
DB_HOST="localhost"
DB_PORT="5433"
BACKUP_DIR="/var/backups/glamping"
KEEP_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="${BACKUP_DIR}/glamping_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Бэкап создан: $BACKUP_FILE ($SIZE)"

find "$BACKUP_DIR" -name "glamping_*.sql.gz" -mtime +${KEEP_DAYS} -delete
REMAINING=$(ls "$BACKUP_DIR"/glamping_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Хранится бэкапов: $REMAINING"
