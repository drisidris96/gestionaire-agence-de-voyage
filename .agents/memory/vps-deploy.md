---
name: VPS Auto-Deploy Setup
description: How to deploy to the Hetzner VPS at buydriss.co.uk automatically from Replit
---

## SSH Key
- Private key: `/home/runner/.ssh/deploy_key` (ed25519, persists in Replit workspace)
- Public key added to `/root/.ssh/authorized_keys` on the VPS

## VPS Details
- IP: `46.225.6.147` (buydriss.co.uk)
- User: `root`
- Repo: `/root/gestionaire-agence-de-voyage/gestionaire-agence-de-voyage`
- Frontend dist: `/var/www/travel/artifacts/travel-agency/dist/public`
- DB: `travel_agency` database, user `travel`, password `StrongPass123`
- API port: `8082` (nginx proxies buydriss.co.uk /api → 8082)
- PM2 process name: `travel-api`

## Auto-Deploy Command
Run from workspace root after making any code changes:
```bash
bash deploy/auto-deploy.sh
```
This builds API + frontend locally, uploads via scp, and restarts PM2.

**Why:** SSH key is stored locally in Replit workspace (not in git). The deploy script handles build + upload + PM2 restart in one step.

**How to apply:** After every code change session, run `bash deploy/auto-deploy.sh` from the workspace root to push to production.
