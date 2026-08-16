# SPIRION rename (from DIG) — plexon-v3

**Updated:** 2026-08-16  
**Canonical product id:** `spirion`  
**Display name:** `SPIRION`  
**Legacy:** `dig` / DIG / Design Intelligence Graph

## Code

- `PLATFORM_PRODUCT_IDS` includes `spirion` (not `dig`)
- Env: prefer `NEXT_PUBLIC_SPIRION_URL` / `SPIRION_API_URL`; fall back to `NEXT_PUBLIC_DIG_URL` / `DIG_API_URL`
- Helpers: `getSpirionUrl` / `getSpirionServiceApiUrl`; `getDigUrl` / `getDigServiceApiUrl` are thin aliases
- Origin: `POST /api/platform/provisioning/spirion-project-origin` (canonical); `dig-project-origin` re-exports
- Body: `spirionProjectId` or legacy `digProjectId`
- Capabilities: `spirion.capture` … `spirion.generate`

## Coolify / ops

1. Set `NEXT_PUBLIC_SPIRION_URL` (or keep `NEXT_PUBLIC_DIG_URL` for one release)
2. Optionally set `SPIRION_API_URL` (or legacy `DIG_API_URL`)
3. Redeploy plexon-v3
4. Run SQL: `lib/db/migrations/0008_rename_dig_to_spirion.sql`

FQDN `dig.projects-a.plygrnd.tech` can stay until infra rename.
