# Collection Test Flow — Wave 1 staging smoke

Routes (helpers in `lib/constants.ts`):

- Gallery: `/projects/{platformProjectId}/flows`
- Board: `/projects/{platformProjectId}/flows/{flowId}`
- Run: `POST /api/platform/projects/{id}/flows/{flowId}/run`

## Preconditions

1. Staging DB has migration applied (`collection_test_flows` via `pnpm db:push` / `0005_collection_test_flows.sql`).
2. Collection has a **CHECKION** product binding (`externalProjectId`).
3. Plexon has `CHECKION_API_URL` + `CHECKION_API_TOKEN` (user API token) for BFF scans.
4. Session user can edit the Collection (same ACL as Knowledge Pack).

## Steps

1. Open Collection magazine → **Flows** chip (or go to gallery URL).
2. Create **page-quality** flow (URL empty → uses Collection domain).
3. On the board, press **Testen**.
4. Expect: scan node → score gate → `quality_ok` or `abandon`; verdict card shows `collectionReady` true/false with `overallScore`.
5. Reload board — `lastVerdict` / `lastRun` persist on the flow jsonb.

## Failures to check

- Missing Checkion binding → API 400 with clear message.
- Missing/invalid token → run error verdict, not silent hang.
- Score &lt; 70 → `abandon`, `collectionReady=false`, evidence still valid if score present.
