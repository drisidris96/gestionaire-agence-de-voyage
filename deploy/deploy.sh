#!/bin/bash
# ============================================================
#  deploy.sh — أمر واحد على VPS لسحب الكود وتشغيله
#
#  الاستخدام (على السيرفر):
#    bash /var/www/chouiaar/deploy/deploy.sh
#
#  أو عبر alias سريع — أضفه في ~/.bashrc :
#    alias deploy='bash /var/www/chouiaar/deploy/deploy.sh'
#  ثم فقط اكتب:  deploy
# ============================================================
set -e

APP_DIR="/var/www/chouiaar"
cd "$APP_DIR"

echo "🔄 سحب آخر تحديث..."
git pull origin main

echo "📦 تثبيت الحزم (إذا تغيّرت)..."
pnpm install --frozen-lockfile

echo "🔨 بناء المشروع..."
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/travel-agency run build

echo "♻️  إعادة تشغيل الـ API..."
pm2 reload chouiaar-api --update-env

echo ""
echo "✅ تم النشر بنجاح — $(date '+%Y-%m-%d %H:%M:%S')"
