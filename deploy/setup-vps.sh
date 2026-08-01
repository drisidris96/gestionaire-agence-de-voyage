#!/bin/bash
# ============================================================
#  CHOUIAAR — إعداد VPS من الصفر (يُشغَّل مرة واحدة فقط)
#  الاستخدام: bash deploy/setup-vps.sh
# ============================================================
set -e

APP_DIR="/var/www/travel"
REPO_URL="https://github.com/drisidris96/gestionaire-agence-de-voyage.git"
PM2_APP="travel-api"
DB_NAME="agence_voyage"
DB_USER="agence"

echo "══════════════════════════════════════════"
echo "  ⚙️   إعداد السيرفر — CHOUIAAR"
echo "══════════════════════════════════════════"

# ── 1. تحديث النظام ─────────────────────────────────────────
echo ""
echo "📥  تحديث النظام..."
apt update && apt upgrade -y

# ── 2. تثبيت Node.js 20 ──────────────────────────────────────
echo ""
echo "📦  تثبيت Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "   Node: $(node -v)"

# ── 3. تثبيت pnpm و pm2 ──────────────────────────────────────
echo ""
echo "📦  تثبيت pnpm و pm2..."
npm install -g pnpm pm2
echo "   pnpm: $(pnpm -v)"

# ── 4. تثبيت PostgreSQL و Nginx ──────────────────────────────
echo ""
echo "🗄️   تثبيت PostgreSQL و Nginx..."
apt install -y postgresql postgresql-contrib nginx git
systemctl enable postgresql && systemctl start postgresql

# ── 5. إنشاء قاعدة البيانات ──────────────────────────────────
echo ""
echo "🗄️   إعداد قاعدة البيانات..."
read -s -p "   أدخل كلمة مرور قاعدة البيانات: " DB_PASS
echo ""

sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
CREATE DATABASE IF NOT EXISTS $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# ── 6. استنساخ المشروع ───────────────────────────────────────
echo ""
echo "📂  استنساخ المشروع..."
mkdir -p /var/www
if [ -d "$APP_DIR" ]; then
  echo "   المجلد موجود، سيتم التحديث..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 7. إنشاء ملف .env ────────────────────────────────────────
echo ""
echo "🔐  إنشاء ملف .env..."
SESSION_SECRET=$(openssl rand -hex 32)

cat > "$APP_DIR/artifacts/api-server/.env" <<ENVEOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
SESSION_SECRET=$SESSION_SECRET
PORT=4000
NODE_ENV=production
ENVEOF
echo "   تم إنشاء .env في $APP_DIR/artifacts/api-server/.env"

# ── 8. البناء والتشغيل ───────────────────────────────────────
echo ""
echo "🔧  بناء وتشغيل التطبيق..."
cd "$APP_DIR"
bash deploy/vps-deploy.sh

# ── 9. إعداد Nginx ───────────────────────────────────────────
echo ""
echo "🌐  إعداد Nginx..."
read -p "   أدخل اسم الدومين أو IP السيرفر: " SERVER_NAME

cat > /etc/nginx/sites-available/travel <<NGINXEOF
server {
    listen 80;
    server_name $SERVER_NAME;

    root $APP_DIR/artifacts/travel-agency/dist/public;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/travel /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ── 10. PM2 عند التشغيل التلقائي ─────────────────────────────
echo ""
echo "⚡  تفعيل PM2 عند إعادة التشغيل..."
pm2 startup | tail -1 | bash || true
pm2 save

echo ""
echo "══════════════════════════════════════════"
echo "  ✅  اكتمل الإعداد!"
echo "  🌍  الموقع: http://$SERVER_NAME"
echo "══════════════════════════════════════════"
