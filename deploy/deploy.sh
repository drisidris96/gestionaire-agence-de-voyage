#!/bin/bash
# ============================================================
#  deploy.sh — يُنفَّذ على VPS عند كل push على main
# ============================================================
set -e

APP_DIR="/var/www/chouiaar"
cd "$APP_DIR"

echo ">>> سحب آخر تحديث من GitHub..."
git pull origin main

echo ">>> تثبيت الحزم..."
pnpm install --frozen-lockfile

echo ">>> بناء المشروع..."
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/travel-agency run build

echo ">>> إعادة تشغيل API مع PM2..."
pm2 reload ecosystem.config.cjs --update-env

echo "✅ تم النشر بنجاح"
