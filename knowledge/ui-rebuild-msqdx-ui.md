# PLEXON v3 — UI rebuild on `@msqdx/ui`

**Started:** 2026-07-31  
**Repo:** `plexon-v3` (staging island)  
**Target DS:** `@msqdx/ui` + `@msqdx/ui-tokens` (sibling `msqdx-ui`)  
**Not:** `@msqdx/react` / MUI (legacy v2)

## Progress

| Wave | Surface | Status |
|------|---------|--------|
| 0 | Foundation (wiring, AppShell/NavRail, Auth) | wiring + auth + specs done; `ignoreBuildErrors` until waves clear shim gaps |
| 1 | Dashboard `/` | done — `SectionChrome` + `@msqdx/ui` adapters; no `@mui`/`@msqdx/react` imports |
| 2 | Settings `/settings` | pending — see `ui-migrate-settings.md` |
| 3 | Products + Platform projects | catalog done; project detail pending |
| 4 | Admin console | layout/subnav done; pages pending |
| 5 | Assistant | pending — see `ui-migrate-assistant.md` |
| 6 | Event Quick Check | pending — see `ui-migrate-event-quick-check.md` |
| 7 | Board + legacy DS removal | pending — see `ui-migrate-board.md`; bridge narrowed (no full MUI DS re-export) |

## Compatibility (temporary)

Until Waves 1–7 finish, webpack aliases keep legacy imports compiling:

- `@msqdx/ui` → curated barrel (`lib/msqdx-ui.ts`)
- `@msqdx/react` → bridge (`lib/msqdx-react-bridge/`) — magazine primitives + legacy board
- `@mui/material` → shim (`lib/mui-shim.tsx`) — **not** real MUI; remove in Wave 7
- `@msqdx/tokens` → shim / legacy tokens for board DS only

**Target:** every surface imports `@msqdx/ui` only; delete bridge + shim.

## Specs

Index: `specs/domain/ui-migrate.md`  
Per wave: `ui-migrate-dashboard.md` · `ui-migrate-settings.md` · `ui-migrate-products.md` · `ui-migrate-admin.md` · `ui-migrate-assistant.md` · `ui-migrate-event-quick-check.md` · `ui-migrate-board.md`

## Pattern (from audion-v3)

- Shell: `AppFrame` + dockable `NavRail` + `BrandCorner` + `PageTitle`
- Barrels: `lib/msqdx-ui.ts`, `lib/msqdx-ui-shell.ts`
- Paths: `lib/shell-paths.ts` + `lib/constants.ts` — no hardcoded URLs in UI
- Theme: `data-theme={shellPaths.defaultTheme}` + `@import '@msqdx/ui/styles.css'`
- Backend/federation APIs stay live — UI cutover only

## Key files

- `components/AppShell.tsx`
- `components/nav-icons.tsx`
- `app/layout.tsx`
- `styles/globals.css`
- `specs/domain/app-shell.md`
- `AGENTS.md`
