#!/bin/bash
# Деплой на VPS
# Использование: ./scripts/vps-deploy.sh
# Предварительно: настроить SSH ключ для root@109.196.99.62

set -euo pipefail

VPS="root@109.196.99.62"
REMOTE_DIR="/home/glamping/app"
LOCAL_DIR="/home/gleb/HOTEL/app"

echo "=== Деплой на $VPS ==="

# 1. Синхронизация кода (исключая .env, .git, node_modules, uploads, coverage)
echo "[1/6] Синхронизация файлов..."
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'glamping-backend/.env' \
  --exclude 'glamping-backend/.env.production' \
  --exclude 'glamping-backend/uploads' \
  --exclude 'glamping-backend/coverage' \
  --exclude 'glamping-frontend/node_modules' \
  --exclude 'glamping-frontend/apps/*/node_modules' \
  --exclude 'glamping-frontend/packages/*/node_modules' \
  --exclude 'export.json' \
  --exclude 'export.geojson' \
  --exclude '.mimocode' \
  --exclude '.claude' \
  "$LOCAL_DIR/" "$REMOTE_DIR/"

# 2. Установка зависимостей backend
echo "[2/6] Backend: npm ci..."
ssh "$VPS" "cd $REMOTE_DIR/glamping-backend && npm ci --omit=dev"

# 3. Prisma
echo "[3/6] Backend: prisma generate + migrate..."
ssh "$VPS" "cd $REMOTE_DIR/glamping-backend && npx prisma generate && npx prisma migrate deploy"

# 4. Build frontend
echo "[4/6] Frontend: build..."
ssh "$VPS" "cd $REMOTE_DIR/glamping-frontend && npm ci --omit=dev"
ssh "$VPS" "cd $REMOTE_DIR/glamping-frontend/apps/guest && npx vite build"
ssh "$VPS" "cd $REMOTE_DIR/glamping-frontend/apps/admin && npx vite build"

# 5. Перезапуск backend
echo "[5/6] Backend: pm2 restart..."
ssh "$VPS" "cd $REMOTE_DIR/glamping-backend && pm2 restart ecosystem.config.js --update-env"

# 6. Перезагрузка nginx
echo "[6/6] Nginx: reload..."
ssh "$VPS" "nginx -t && systemctl reload nginx"

echo "=== Деплой завершён ==="
echo "Проверка: curl -s https://exemplehotel.tw1.ru/api/health"
