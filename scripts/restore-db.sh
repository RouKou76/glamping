#!/bin/bash
# Восстановление БД из бэкапа
# Использование: ./restore-db.sh /var/backups/glamping/glamping_2026-07-24_03-00.sql.gz

set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Использование: $0 <путь_к_бэкапу.sql.gz>"
  echo ""
  echo "Доступные бэкапы:"
  ls -lh /var/backups/glamping/glamping_*.sql.gz 2>/dev/null || echo "  Нет бэкапов"
  exit 1
fi

DB_NAME="glamping"
DB_USER="glamping"
DB_HOST="localhost"
DB_PORT="5433"

echo "ВНИМАНИЕ: БД $DB_NAME будет перезаписана из $BACKUP_FILE"
read -p "Продолжить? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Отменено"
  exit 0
fi

gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --quiet
echo "[$(date)] Восстановление завершено из $BACKUP_FILE"
