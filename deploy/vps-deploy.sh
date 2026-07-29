#!/usr/bin/env bash
# سكريبت النشر على VPS — يُشغَّل مباشرة من داخل الخادم
# الاستخدام: bash /root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage/deploy/vps-deploy.sh

set -euo pipefail

# ═══ إعدادات ═══════════════════════════════════════════════════
REPO_DIR="/root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage"
FRONTEND_OUT="$REPO_DIR/artifacts/travel-agency/dist/public"
FRONTEND_SERVE="/var/www/travel/artifacts/travel-agency/dist/public"
API_OUT="$REPO_DIR/artifacts/api-server/dist"
API_SERVE="/var/www/travel/api/dist"
ECOSYSTEM="$REPO_DIR/deploy/ecosystem-vps.config.cjs"
PM2_APP="travel-api"
# ════════════════════════════════════════════════════════════════

cd "$REPO_DIR"

echo "━━━ 1/6 سحب آخر التحديثات من GitHub ━━━"
git fetch origin
git reset --hard origin/main

echo "━━━ 2/6 تثبيت الاعتماديات ━━━"
pnpm install --frozen-lockfile

echo "━━━ 3/6 بناء الـ Frontend ━━━"
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/travel-agency run build

echo "━━━ 4/6 بناء الـ API ━━━"
pnpm --filter @workspace/api-server run build

echo "━━━ 5/6 نسخ الملفات ━━━"
mkdir -p "$FRONTEND_SERVE"
rsync -a --delete "$FRONTEND_OUT/" "$FRONTEND_SERVE/"

mkdir -p "$API_SERVE"
rsync -a --delete "$API_OUT/" "$API_SERVE/"

# نسخ ملف PM2
cp "$ECOSYSTEM" /var/www/travel/ecosystem.config.cjs

echo "━━━ 6/6 إعادة تشغيل API ━━━"
if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
  pm2 reload /var/www/travel/ecosystem.config.cjs --update-env
else
  pm2 start /var/www/travel/ecosystem.config.cjs
  pm2 save
fi

echo ""
echo "✅ تم النشر بنجاح!"
pm2 status "$PM2_APP"
