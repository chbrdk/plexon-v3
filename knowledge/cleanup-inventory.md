# Cleanup inventory — plexon-v3

**Date:** 2026-09-26 (App-Finalisierung Prio 1 slice)

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `lib/mui-shim.tsx` + `lib/mui-subpath-shims.ts` | reshape | Only `ReactFlowBoard` still imports `@mui/material` | Gate + `ui-visual` cleared 2026-09-26 |
| `lib/msqdx-react-bridge/` | reshape | `ReactFlowBoard` + `lib/board-*.ts` | RequireAdminRole cleared; do not expand |
| `components/board/ReactFlowBoard.tsx` | reshape | Live `/board` island | Collection Flows are SoT for new work |
| `lib/board-thread.ts` · `board-collision.ts` · `board-connection-history.ts` | reshape | Bridge types / `wouldOverlap` | Move with canvas rewrite |
| `components/auth/RequireAdminRole.tsx` | drop_safe **done** 2026-09-26 | `@msqdx/ui` Spinner | Used by board + design-system layouts |
| `lib/assistant/ui-visual.ts` · `ui-typography.ts` | reshape **done** 2026-09-26 | Local `BrandColor` + `alpha` | No MUI/bridge imports |
| `app/board/page.tsx` | keep | Chrome on `@msqdx/ui` | Spec `ui-migrate-board.md` |
| `components/projects/CollectionClientRoomPanel.tsx` | defer | API keep; panel hidden | Product call for UX |
| `lib/assistant/glass-chat-*` | drop_safe **done** | Welle 2b | Removed with tests |
| Orphan chrome (`InfoTooltip`, `Sidebar`, `PlexonPageChrome`, …) | drop_safe **done** | Welle 2a | Swept |
| `knowledge/lab-tile-migration.md` | defer | Dev note | Keep until EQC knowledge absorbs |
| `knowledge/plexon-setup.md` (`@msqdx/react` section) | reshape | Ops scripts cite it | Doc drift vs bridge/`msqdx-ui` |
| `locales` designSystem copy | reshape | `/design-system` admin page | Text cleanup after DS page rebuild |
| `public/*.html` demos | keep | Specs + tests | Contract demos |
