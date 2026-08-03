#!/bin/bash
set -e

APP_DIR="/root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage"
DB_PASS="Travel2024secure"
DB_URL="postgresql://travel:${DB_PASS}@localhost:5432/travel_db"
SESSION_SECRET="eb788dc3163030781b1b36659a11b4a0af410c4a5bd9430bb057ddb0f088754e"

echo "==> 1. تغيير كلمة مرور قاعدة البيانات..."
sudo -u postgres psql -c "ALTER USER travel WITH PASSWORD '${DB_PASS}';"
echo "    OK"

echo "==> 2. التحقق من الاتصال..."
PGPASSWORD="${DB_PASS}" psql -U travel -d travel_db -h localhost -c "SELECT count(*) FROM clients;" 2>&1
echo "    OK"

echo "==> 3. تحديث الكود..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

echo "==> 4. كتابة ملف .env..."
cat > "$APP_DIR/artifacts/api-server/.env" << ENVEOF
DATABASE_URL=${DB_URL}
SESSION_SECRET=${SESSION_SECRET}
PORT=4000
NODE_ENV=production
ENVEOF
echo "    OK"
cat "$APP_DIR/artifacts/api-server/.env"

echo "==> 5. بناء التطبيق..."
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/travel-agency run build

echo "==> 6. إيقاف كل العمليات القديمة..."
pm2 delete all 2>/dev/null || true
sleep 2
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true
sleep 2

echo "==> 7. كتابة ecosystem.config.cjs..."
cat > "$APP_DIR/ecosystem.config.cjs" << ECOEOF
module.exports = {
  apps: [{
    name: "travel-api",
    script: "${APP_DIR}/artifacts/api-server/dist/index.mjs",
    interpreter: "node",
    interpreter_args: "--enable-source-maps",
    env: {
      NODE_ENV: "production",
      PORT: "4000",
      DATABASE_URL: "${DB_URL}",
      SESSION_SECRET: "${SESSION_SECRET}"
    }
  }]
}
ECOEOF

echo "==> 8. تشغيل PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup 2>/dev/null | grep -E "^sudo" | bash 2>/dev/null || true

sleep 4
echo ""
echo "==> النتيجة:"
pm2 status
echo ""
pm2 logs travel-api --lines 8 --nostream
