#!/usr/bin/env bash
# سكريبت النشر التلقائي — يُشغَّل من Replit بعد كل تعديل
set -e

SSH_KEY="/home/runner/.ssh/deploy_key"
VPS="root@46.225.6.147"
REPO="/root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage"
FRONTEND_DIST="/var/www/travel/artifacts/travel-agency/dist/public"
DB_URL="postgresql://travel:StrongPass123@localhost:5432/travel_agency"
SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=no"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"

echo "🔨 Building API & Frontend..."
cd "$(dirname "$0")/.."
pnpm --filter @workspace/api-server run build
PORT=8082 BASE_PATH=/ pnpm --filter @workspace/travel-agency run build

echo "📦 Packaging..."
tar -czf /tmp/api-dist.tar.gz -C artifacts/api-server/dist .
tar -czf /tmp/fe-dist.tar.gz  -C artifacts/travel-agency/dist/public .

echo "🚀 Uploading to VPS..."
$SCP /tmp/api-dist.tar.gz "$VPS:/tmp/"
$SCP /tmp/fe-dist.tar.gz  "$VPS:/tmp/"

echo "♻️  Applying on VPS..."
$SSH "$VPS" bash << REMOTE
set -e
cd $REPO
git pull origin main

# فك ضغط الـ build
mkdir -p $REPO/artifacts/api-server/dist
tar -xzf /tmp/api-dist.tar.gz -C $REPO/artifacts/api-server/dist

mkdir -p $FRONTEND_DIST
tar -xzf /tmp/fe-dist.tar.gz -C $FRONTEND_DIST

rm -f /tmp/api-dist.tar.gz /tmp/fe-dist.tar.gz

# إعادة تشغيل الـ API
pm2 describe travel-api > /dev/null 2>&1 \
  && pm2 restart travel-api \
  || DATABASE_URL=$DB_URL NODE_ENV=production PORT=8082 \
     pm2 start $REPO/artifacts/api-server/dist/index.mjs \
     --name travel-api --node-args="--enable-source-maps"
pm2 save

echo "✅ Done"
REMOTE

echo "✅ Deployed successfully → buydriss.co.uk"
