#!/bin/bash
# ============================================================
#  CHOUIAAR Travel Agency — VPS Deploy Script
#  الاستخدام: bash deploy/vps-deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/travel"
PM2_APP="travel-api"

echo "══════════════════════════════════════════"
echo "  🚀  نشر تطبيق CHOUIAAR على السيرفر"
echo "══════════════════════════════════════════"

# ── 1. تثبيت الحزم ──────────────────────────────────────────
echo ""
echo "📦  تثبيت الحزم..."
pnpm install --frozen-lockfile

# ── 2. بناء الـ Backend ──────────────────────────────────────
echo ""
echo "🔧  بناء الـ Backend..."
pnpm --filter @workspace/api-server run build

# ── 3. بناء الـ Frontend ─────────────────────────────────────
echo ""
echo "🎨  بناء الـ Frontend..."
pnpm --filter @workspace/travel-agency run build

# ── 4. إعادة تشغيل PM2 ──────────────────────────────────────
echo ""
if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
  echo "🔄  إعادة تشغيل PM2 ($PM2_APP)..."
  pm2 restart "$PM2_APP"
else
  echo "▶️   تشغيل PM2 لأول مرة..."

  # تحقق من وجود ملف .env
  if [ ! -f "$APP_DIR/artifacts/api-server/.env" ]; then
    echo ""
    echo "⚠️  تحذير: ملف .env غير موجود!"
    echo "    أنشئه في: $APP_DIR/artifacts/api-server/.env"
    echo "    المحتوى المطلوب:"
    echo "      DATABASE_URL=postgresql://USER:PASS@localhost:5432/DB_NAME"
    echo "      SESSION_SECRET=YOUR_SECRET_64_CHARS"
    echo "      PORT=4000"
    echo "      NODE_ENV=production"
    echo ""
    exit 1
  fi

  # تحميل متغيرات البيئة من .env
  export $(grep -v '^#' "$APP_DIR/artifacts/api-server/.env" | xargs)

  pm2 start "$APP_DIR/artifacts/api-server/dist/index.mjs" \
    --name "$PM2_APP" \
    --interpreter node \
    --node-args "--enable-source-maps" \
    --env production
  pm2 save
fi

# ── 5. إعادة تحميل Nginx ────────────────────────────────────
echo ""
if command -v nginx &> /dev/null; then
  echo "🌐  إعادة تحميل Nginx..."
  nginx -t && systemctl reload nginx
fi

echo ""
echo "══════════════════════════════════════════"
echo "  ✅  تم النشر بنجاح!"
echo "══════════════════════════════════════════"
pm2 status "$PM2_APP"
