# Coolify — switch `plexon-v3` app to repo `plexon-v3`

**Date:** 2026-07-30  
**Repo:** https://github.com/chbrdk/plexon-v3  
**Domain:** https://plexon-v3.projects-a.plygrnd.tech  
**Companion cheat-sheet:** `knowledge/coolify-plexon-v3-env-cheatsheet.md`

## Checklist (manual in Coolify UI)

1. Open Project `msqdx-ecosystem-v3` → Environment `staging` → Application **`plexon-v3`**
2. **Source:** change Git repository from `PLEXON` / `chbrdk/PLEXON` → **`chbrdk/plexon-v3`**
3. Branch: **`main`**
4. Build Pack: **Dockerfile** · Path: `/Dockerfile` · Port: **`3000`**
5. Keep existing: Domain/TLS, `plexon-v3-postgres` link, Runtime env (`AUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL`, `PUBLIC_APP_URL`, `PLEXON_SERVICE_SECRET`, …)
6. **Redeploy** (force rebuild)

## Success criteria

```bash
curl -fsS https://plexon-v3.projects-a.plygrnd.tech/api/health
# expect HTTP 200 + ok payload
```

If still **503**: check Coolify deploy logs (DB URL, migrations/`drizzle-kit push`, missing `AUTH_SECRET`, TLS/issuer). SSL “unable to get local issuer” from some clients can be a local CA issue — use browser or Coolify healthcheck.

## After Health 200 — Smoke A6 / A10

See `knowledge/federation-smoke-a6-a10.md`.
