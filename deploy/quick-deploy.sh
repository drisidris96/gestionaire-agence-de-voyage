#!/bin/bash
set -e

APP_DIR="/root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage"

echo "==> 1. تغيير كلمة مرور قاعدة البيانات..."
echo "ALTER USER travel WITH PASSWORD 'Travel2024!';" > /tmp/fix_pass.sql
sudo -u postgres psql -f /tmp/fix_pass.sql
rm /tmp/fix_pass.sql

echo "==> 2. تحديث الكود..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

echo "==> 3. إنشاء ملف .env..."
printf 'DATABASE_URL=postgresql://travel:Travel2024!@localhost:5432/travel_db\nSESSION_SECRET=eb788dc3163030781b1b36659a11b4a0af410c4a5bd9430bb057ddb0f088754e\nPORT=4000\nNODE_ENV=production\n' > "$APP_DIR/artifacts/api-server/.env"

echo "==> 4. بناء التطبيق..."
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/travel-agency run build

echo "==> 5. إعادة تشغيل PM2..."
pm2 restart travel-api || pm2 start "$APP_DIR/artifacts/api-server/dist/index.mjs" \
  --name travel-api \
  --interpreter node \
  --node-args "--enable-source-maps"
pm2 save

echo ""
echo "✅ تم! جاري عرض الـ logs..."
sleep 3
pm2 logs travel-api --lines 10 --nostream
