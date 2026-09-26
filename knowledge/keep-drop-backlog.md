# Keep / drop backlog — PLEXON v3

**Date:** 2026-09-26  
**Cleanup:** [`suite-cleanup.md`](suite-cleanup.md) · Inventar: [`cleanup-inventory.md`](cleanup-inventory.md)

## Keep

| Area | Notes |
|---|---|
| Collection model + federation | Sole user-facing project |
| Share-Links Hub | Operative Freigabe-Fläche (E2 UX deferred for ClientRoom panel) |
| Collection Flows / EQC / Assistant | Live |
| Suite Audit / Activity ingest | Live |

## Reshape (do not blind-delete)

| Area | Notes |
|---|---|
| `lib/mui-shim.tsx` + `lib/msqdx-react-bridge/` | Board still imports `@msqdx/react` — rebuild importing surface first (`AGENTS.md`) |
| `components/board/ReactFlowBoard.tsx` | Legacy board; Collection Flows are SoT |

## Drop / reference-only (candidates — see inventory)

| Area | Notes |
|---|---|
| Orphan knowledge with no inbound links | Inventor classifies `drop_safe` |
| ClientRoom **panel** on dashboard | Already hidden; **API keep** |

## Defer

| Area | Notes |
|---|---|
| Kundenraum-UX wieder einblenden | Explicit product call |
| E9 IdP runtime | Stub only |
