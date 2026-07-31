# PLEXON v3 — UI rebuild on `@msqdx/ui`

**Started:** 2026-07-31  
**Repo:** `plexon-v3` (staging island)  
**Target DS:** `@msqdx/ui` + `@msqdx/ui-tokens` (sibling `msqdx-ui`)  
**Reference:** `audion-v3` composition · **not** skin-the-legacy  
**Reuse:** `knowledge/ui-rebuild-reuse.md`  
**Not:** `@msqdx/react` / MUI for finished surfaces

## Posture

Challenge keep/reshape/drop every wave. Reuse Audion chat/settings patterns and `@msqdx/ui` chrome. Rebuild surfaces cleanly; keep required capability.

## Specs

Index: `specs/domain/ui-migrate.md`  
Per wave: `ui-migrate-dashboard.md` · `ui-migrate-settings.md` · `ui-migrate-products.md` · `ui-migrate-admin.md` · `ui-migrate-assistant.md` · `ui-migrate-event-quick-check.md` · `ui-migrate-board.md`

## Progress

| Wave | Surface | Status |
|------|---------|--------|
| 0 | Foundation (wiring, AppShell/NavRail, Auth) | wiring + auth + specs done; `ignoreBuildErrors` until waves clear shim gaps |
| 1 | Dashboard `/` | adapter pass done; **challenge revisit** open (admin-on-home, Dash* adapters) |
| 2 | Settings `/settings` | done — Audion-like SectionChrome/Field/ToggleGroup; theme + brand; APIs kept |
| 3 | Products + Platform projects | done — catalog + project detail on SectionChrome/Panel/StatLede |
| 4 | Admin console | done — overview/users/companies/detail on SectionChrome/Field/table |
| 5 | Assistant | pending — **compose Audion chat chrome** |
| 6 | Event Quick Check | pending — rebuild workflow UI |
| 7 | Board + legacy DS removal | pending — bridge removal |

## Compatibility (temporary)

Until Waves 2–7 finish, webpack aliases keep legacy imports compiling for non-rebuilt files:

- `@msqdx/ui` → curated barrel (`lib/msqdx-ui.ts`)
- `@msqdx/react` → bridge (`lib/msqdx-react-bridge/`)
- `@mui/material` → shim (`lib/mui-shim.tsx`) — **not** real MUI; remove in Wave 7
- `@msqdx/tokens` → legacy tokens for board DS only

**Target:** every surface imports `@msqdx/ui` only; delete bridge + shim.

## Pattern (from audion-v3)

- Shell: `AppFrame` + dockable `NavRail` + `BrandCorner` + `PageTitle`
- Chat: DS `.chat-*` + Audion panel/workspace composition
- Barrels: `lib/msqdx-ui.ts`, `lib/msqdx-ui-shell.ts`
- Paths: `lib/shell-paths.ts` + `lib/constants.ts` — no hardcoded URLs in UI
- Theme: `data-theme={shellPaths.defaultTheme}` + `@msqdx/ui` styles
- Backend/federation APIs stay live unless a wave explicitly redesigns them

## Key files

- `components/AppShell.tsx`
- `components/nav-icons.tsx`
- `app/layout.tsx`
- `styles/globals.css`
- `specs/domain/app-shell.md`
- `specs/domain/ui-migrate.md`
- `AGENTS.md`
