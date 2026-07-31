# PLEXON v3 — UI rebuild on `@msqdx/ui`

**Started:** 2026-07-31  
**Repo:** `plexon-v3` (staging island)  
**Target DS:** `@msqdx/ui` + `@msqdx/ui-tokens` (sibling `msqdx-ui`)  
**Not:** `@msqdx/react` / MUI (legacy v2)

## Progress

| Wave | Surface | Status |
|------|---------|--------|
| 0 | Foundation (wiring, AppShell/NavRail, Auth) | ~90% — shell/auth/docs/tests; build still needs token/MUI bridge polish |
| 1 | Dashboard `/` | partial — magazine wrapper only; page still legacy bridge |
| 2 | Settings `/settings` | pending (bridge) |
| 3 | Products + Platform projects | products page + ProductCatalog on `@msqdx/ui`; project detail pending |
| 4 | Admin console | layout + subnav on `@msqdx/ui`; pages still bridge |
| 5 | Assistant | pending (bridge) |
| 6 | Event Quick Check | pending (bridge) |
| 7 | Board + legacy DS removal | pending — Prismion still from `msqdx-design-system` via bridge |

## Compatibility (temporary)

Until Waves 1–7 finish, webpack aliases keep legacy imports compiling:

- `@msqdx/ui` → curated barrel (`lib/msqdx-ui.ts`)
- `@msqdx/react` → bridge (`lib/msqdx-react-bridge/`) — magazine primitives + legacy board
- `@mui/material` → shim (`lib/mui-shim.tsx`) — **not** real MUI; remove in Wave 7
- `@msqdx/tokens` → shim / legacy tokens for board DS only

**Target:** every surface imports `@msqdx/ui` only; delete bridge + shim.

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
