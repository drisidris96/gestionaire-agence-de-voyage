#!/usr/bin/env bash
# سكريبت النشر — يُشغَّل من جهازك المحلي (ليس من الخادم)
# يبني التطبيق ثم ينقله عبر SSH ويعيد تشغيله

set -euo pipefail

# ═══ إعدادات — عدّلها قبل الاستخدام ════════════════════════════
SSH_USER="root"                    # مستخدم SSH على VPS
SSH_HOST="buydriss.co.uk"          # IP أو دومين الخادم
SSH_PORT="22"
APP_DIR="/var/www/atlas-travel"
# ═══════════════════════════════════════════════════════════════

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> 1/5 تثبيت الاعتماديات"
pnpm install --frozen-lockfile

echo "==> 2/5 توليد الكود من OpenAPI + فحص الأنواع"
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck

echo "==> 3/5 بناء الـ API"
pnpm --filter @workspace/api-server run build

echo "==> 4/5 بناء الـ Frontend"
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/travel-agency run build

echo "==> 5/5 رفع الملفات إلى الخادم"
SSH="ssh -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST}"
RSYNC_SSH="ssh -p ${SSH_PORT}"

# 5a) ملفات الـ API + node_modules مطلوبة على الخادم
$SSH "mkdir -p ${APP_DIR}/api/dist ${APP_DIR}/public"

rsync -avz --delete -e "$RSYNC_SSH" \
  artifacts/api-server/dist/ \
  ${SSH_USER}@${SSH_HOST}:${APP_DIR}/api/dist/

# 5b) ملفات الـ Frontend الثابتة
rsync -avz --delete -e "$RSYNC_SSH" \
  artifacts/travel-agency/dist/public/ \
  ${SSH_USER}@${SSH_HOST}:${APP_DIR}/public/

# 5c) ملف PM2 + Nginx (في حال تعديلها)
rsync -avz -e "$RSYNC_SSH" \
  deploy/ecosystem.config.cjs \
  ${SSH_USER}@${SSH_HOST}:${APP_DIR}/ecosystem.config.cjs

echo "==> إعادة تشغيل API عبر PM2"
$SSH "pm2 reload ${APP_DIR}/ecosystem.config.cjs --update-env || pm2 start ${APP_DIR}/ecosystem.config.cjs"

echo "==> إعادة تحميل Nginx"
$SSH "nginx -t && systemctl reload nginx"

echo
echo "✅ تم النشر! افتح: https://buydriss.co.uk"
