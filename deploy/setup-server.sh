#!/usr/bin/env bash
# سكريبت إعداد لمرة واحدة على خادم VPS (Ubuntu 22.04 / 24.04)
# شغّله بصلاحيات root: bash setup-server.sh

set -euo pipefail

DOMAIN="buydriss.co.uk"
DB_NAME="atlas_travel"
DB_USER="atlas"
APP_DIR="/var/www/atlas-travel"

echo "==> 1/7 تحديث النظام"
apt-get update -y
apt-get upgrade -y

echo "==> 2/7 تثبيت Node.js 24 + pnpm + PM2"
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs build-essential rsync curl ufw
npm install -g pnpm@latest pm2

echo "==> 3/7 تثبيت Nginx + Certbot"
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> 4/7 تثبيت PostgreSQL 16"
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

read -rsp "أدخل كلمة مرور قوية لمستخدم قاعدة البيانات (${DB_USER}): " DB_PASS
echo
sudo -u postgres psql <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "==> 5/7 إنشاء مجلدات التطبيق"
mkdir -p ${APP_DIR}/{api,public,uploads}
mkdir -p /var/log/atlas-travel
chown -R www-data:www-data ${APP_DIR}/uploads
chown -R "$USER":"$USER" ${APP_DIR}/api ${APP_DIR}/public

cat > ${APP_DIR}/api/.env <<ENV
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
NODE_ENV=production
PORT=8080
ENV
chmod 600 ${APP_DIR}/api/.env

echo "==> 6/7 إعداد الجدار الناري"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> 7/7 إعداد Nginx"
cp ./nginx.conf /etc/nginx/sites-available/atlas-travel
ln -sf /etc/nginx/sites-available/atlas-travel /etc/nginx/sites-enabled/atlas-travel
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo
echo "✅ تم إعداد الخادم!"
echo
echo "الخطوات التالية:"
echo "  1. اربط دومين ${DOMAIN} بـ IP الخادم (سجل A في DNS)"
echo "  2. شغّل: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "  3. من جهازك المحلي شغّل: bash deploy.sh"
echo "  4. على الخادم: pm2 start /var/www/atlas-travel/ecosystem.config.cjs && pm2 save && pm2 startup"
