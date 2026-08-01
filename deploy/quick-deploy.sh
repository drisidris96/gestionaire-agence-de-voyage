#!/bin/bash
set -e

APP_DIR="/root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage"
DB_URL="postgresql://travel:Travel2024!@localhost:5432/travel_db"
SESSION_SECRET="eb788dc3163030781b1b36659a11b4a0af410c4a5bd9430bb057ddb0f088754e"

echo "==> 1. تغيير كلمة مرور قاعدة البيانات..."
echo "ALTER USER travel WITH PASSWORD 'Travel2024!';" > /tmp/fix_pass.sql
sudo -u postgres psql -f /tmp/fix_pass.sql
rm -f /tmp/fix_pass.sql
echo "    ✓ تم تغيير كلمة المرور"

echo "==> 2. التحقق من الاتصال بقاعدة البيانات..."
PGPASSWORD='Travel2024!' psql -U travel -d travel_db -h localhost -c "SELECT 1;" > /dev/null 2>&1 && echo "    ✓ الاتصال ناجح" || echo "    ⚠ فشل الاتصال"

echo "==> 3. تحديث الكود..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

echo "==> 4. إنشاء ملف .env..."
printf "DATABASE_URL=%s\nSESSION_SECRET=%s\nPORT=4000\nNODE_ENV=production\n" \
  "$DB_URL" "$SESSION_SECRET" > "$APP_DIR/artifacts/api-server/.env"
echo "    ✓ تم إنشاء .env"

echo "==> 5. بناء التطبيق..."
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/travel-agency run build

echo "==> 6. تحرير المنفذ وإعادة تشغيل PM2..."
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true
pm2 delete travel-api 2>/dev/null || true

# إنشاء ecosystem.config.cjs لضمان قراءة المتغيرات
cat > "$APP_DIR/ecosystem.config.cjs" << ECOEOF
module.exports = {
  apps: [{
    name: "travel-api",
    script: "$APP_DIR/artifacts/api-server/dist/index.mjs",
    interpreter: "node",
    interpreter_args: "--enable-source-maps",
    env: {
      NODE_ENV: "production",
      PORT: "4000",
      DATABASE_URL: "$DB_URL",
      SESSION_SECRET: "$SESSION_SECRET"
    }
  }]
}
ECOEOF

pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save

echo ""
echo "==> الحالة:"
sleep 3
pm2 status travel-api
echo ""
pm2 logs travel-api --lines 5 --nostream
