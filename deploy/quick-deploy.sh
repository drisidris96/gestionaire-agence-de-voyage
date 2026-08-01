#!/bin/bash
set -e
sudo -u postgres psql -c "ALTER USER travel WITH PASSWORD 'Travel2024!';"
cd /var/www/travel
git fetch origin
git reset --hard origin/main
printf 'DATABASE_URL=postgresql://travel:Travel2024!@localhost:5432/travel_db\nSESSION_SECRET=eb788dc3163030781b1b36659a11b4a0af410c4a5bd9430bb057ddb0f088754e\nPORT=4000\nNODE_ENV=production\n' > artifacts/api-server/.env
bash deploy/vps-deploy.sh
