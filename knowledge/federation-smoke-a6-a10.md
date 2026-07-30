# Federation smoke — A6 (plexon) + A10 (audion)

**Date:** 2026-07-30  
**URLs:** `knowledge/repo-origin.md` · `audion-v3/knowledge/deploy-urls.md`

## A6 — plexon-v3

Prerequisite: Coolify source = `chbrdk/plexon-v3` (see `knowledge/coolify-switch-to-plexon-v3-repo.md`).

1. `GET https://plexon-v3.projects-a.plygrnd.tech/api/health` → **200**
2. Open `/register` or Admin login (`PLEXON_ADMIN_EMAIL`)
3. Dashboard loads
4. Optional: `POST /api/auth/validate-credentials` with `PLEXON_SERVICE_SECRET` (from audion later)

## A10 — audion-v3 × plexon-v3

Prerequisite: audion-v3 Runtime env points at plexon-v3 (same `PLEXON_SERVICE_SECRET`).

1. Open https://audion-v3.projects-a.plygrnd.tech/ → Login redirect when Plexon configured
2. Sign in with plexon-v3 user
3. Settings → Account → email + Sign out
4. Create project (origin call ok or graceful skip)
5. Optional: Chat / usage event (non-blocking)

**Prod:** never point these smokes at prod Plexon / `chbrdk/PLEXON` Coolify.
