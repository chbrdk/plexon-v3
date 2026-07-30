# Register 500 — schema push / users table

**Date:** 2026-07-30  
**Symptom:** `POST /api/auth/register` → 500 `{ "error": "Registration failed." }` while `/api/health` is 200.

## Cause

Docker entrypoint runs `drizzle-kit push` then starts Next. Push used to **fail quietly** (app still started) when `lib/db/schema.ts` imported via `@/…` path aliases that drizzle-kit cannot resolve in the runner. Result: empty DB / no `users` table → insert throws → generic 500.

## Fix (in `plexon-v3`)

- Relative imports in `lib/db/schema.ts` (+ `platform-provisioning.ts`) so `drizzle-kit push` works
- Entrypoint **exits 1** if push fails (Coolify shows failed deploy instead of silent 500)
- Clearer register error when relation missing

## Ops

1. Redeploy `plexon-v3` from latest `main`
2. Startup logs must show: `Schema up to date.`
3. Retry https://plexon-v3.projects-a.plygrnd.tech/register with admin email + password
