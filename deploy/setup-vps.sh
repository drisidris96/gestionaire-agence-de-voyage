#!/bin/bash
# ============================================================
#  setup-vps.sh — يُنفَّذ مرة واحدة فقط على السيرفر الجديد
#  sudo bash deploy/setup-vps.sh
# ============================================================
set -e

echo "══════════════════════════════════════════"
echo " إعداد VPS لمشروع شويعر للسياحة والأسفار"
echo "══════════════════════════════════════════"

# ── 1. تحديث النظام ──────────────────────────────────────────
apt-get update -y && apt-get upgrade -y

# ── 2. تثبيت Node.js 20 LTS ──────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx

# ── 3. تثبيت pnpm ────────────────────────────────────────────
npm install -g pnpm pm2

# ── 4. تثبيت PostgreSQL ──────────────────────────────────────
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql && systemctl start postgresql

# ── 5. إنشاء قاعدة البيانات والمستخدم ───────────────────────
echo ">>> إنشاء قاعدة البيانات..."
sudo -u postgres psql <<SQL
CREATE USER chouiaar_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE chouiaar_db OWNER chouiaar_user;
GRANT ALL PRIVILEGES ON DATABASE chouiaar_db TO chouiaar_user;
SQL

# ── 6. استنساخ المشروع ───────────────────────────────────────
mkdir -p /var/www
cd /var/www
echo ">>> استنساخ المستودع..."
# git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git chouiaar
# cd chouiaar

# ── 7. نسخ ملف البيئة ────────────────────────────────────────
# cp deploy/.env.example .env
# nano .env   ← عدّل القيم قبل المتابعة

# ── 8. تثبيت الحزم والبناء ───────────────────────────────────
# pnpm install --frozen-lockfile
# pnpm --filter @workspace/api-server run build
# pnpm --filter @workspace/travel-agency run build

# ── 9. تطبيق مخطط قاعدة البيانات ─────────────────────────────
# pnpm --filter @workspace/db run push

# ── 10. تشغيل API مع PM2 ─────────────────────────────────────
# cp deploy/ecosystem.config.cjs .
# pm2 start ecosystem.config.cjs
# pm2 save
# pm2 startup   ← انسخ الأمر الناتج ونفّذه

# ── 11. إعداد Nginx ──────────────────────────────────────────
# cp deploy/nginx.conf /etc/nginx/sites-available/chouiaar
# nano /etc/nginx/sites-available/chouiaar   ← عدّل yourdomain.com
# ln -sf /etc/nginx/sites-available/chouiaar /etc/nginx/sites-enabled/
# nginx -t && systemctl reload nginx

# ── 12. تثبيت HTTPS مجاناً ───────────────────────────────────
# apt-get install -y certbot python3-certbot-nginx
# certbot --nginx -d yourdomain.com -d www.yourdomain.com

echo ""
echo "✅ انتهى الإعداد الأساسي."
echo "   راجع التعليقات داخل الملف وأكمل الخطوات المتبقية يدوياً."
