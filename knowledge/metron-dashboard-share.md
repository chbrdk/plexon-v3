# METRON dashboard public share

**Date:** 2026-09-14 · **Spec:** `specs/domain/assistant-metron-share.md`

## Why
Operators need EQC-style one-click public links for METRON KPI/chart Auto-UI in the assistant — not the pin→report cart flow.

## Paths
See `knowledge/paths.md` (PATH_SHARE_METRON · apiAssistantMetronDashboardShare · apiPublicMetron).

## Flow
1. Assistant emits METRON Auto-UI with `meta.metronShareSnapshot`
2. Share bar → POST snapshot → clipboard `/share/metron/mtn_…`
3. Public page loads GET `/api/public/metron/:token` → magazine masthead (read-only chip, copy again, print/PDF) + UiBlocks
