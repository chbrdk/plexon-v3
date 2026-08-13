# Repair: MSQ DX Collection missing CREATION mirror

**Date:** 2026-08-13  
**Collection:** `32498667-471e-4b21-b920-5eff5c338300` (MSQ DX)  
**Why:** D2 Brandion-first origin previously sibling-synced only checkion/audion. CREATION `/projects` stayed empty after DS-DEPOSIT.

## After plexon-v3 deploy (`030ec62+`)

On Collection **MSQ DX** (company MSQDX), run capability **Sync** (UI or `POST /api/platform/projects/{id}/sync` as signed-in member). Requires `NEXT_PUBLIC_CREATION_URL` (or `CREATION_API_URL`) on plexon-v3 Coolify.

Expect CREATION upsert → durable row once creation-v3 `projectStore=postgres` is live (`988a398+`).

## Alternate (CREATION UI)

`/projects?platformProjectId=32498667-471e-4b21-b920-5eff5c338300` → create **MSQ DX**.

Canonical diagnosis: `creation-v3/knowledge/empty-projects-after-ds-deposit.md`.
