# Register ENOTFOUND base / AUTH_SECRET — Coolify env

**Date:** 2026-07-30  
**Log:** `Register failed { code: 'ENOTFOUND', detail: 'getaddrinfo ENOTFOUND base' }`  
**Also:** `[PLEXON] AUTH_SECRET is missing or too short`

## Meaning

| Log | Cause |
|-----|--------|
| `ENOTFOUND base` | `DATABASE_URL` hostname is literally **`base`** (placeholder / broken Coolify link). Node cannot resolve DNS. |
| `AUTH_SECRET` short/missing | Must be **Runtime** env, ≥32 chars (`openssl rand -hex 32`). Build-only is not enough. |

Drizzle may still print “Schema up to date” in some cases; the Next app then fails on real queries if the URL the Pool uses is wrong — fix the Coolify **Runtime** `DATABASE_URL`.

## Fix in Coolify

1. Open Postgres resource **`plexon-v3-postgres`** (or whatever you created) → copy **Internal** connection URL.  
   Host must be the **service name** (e.g. `xxxx-plexon-v3-postgres` / Coolify internal hostname), **not** `base`, `localhost`, or a public domain.
2. App `plexon-v3` → Environment → **Runtime**:
   ```bash
   DATABASE_URL=<exact Internal URL from Postgres resource>
   AUTH_SECRET=<openssl rand -hex 32>
   ```
3. If the DB password contains `@`, `#`, `/`, `%` → URL-encode it in the URL.
4. Redeploy. Startup must log something like:  
   `DATABASE_URL ok-ish → user=… host=<service-name> port=5432 database=…`  
   and **must not** say hostname `base`.
5. Register again on https://plexon-v3.projects-a.plygrnd.tech/register
