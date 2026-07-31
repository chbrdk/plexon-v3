# UI migrate — `@msqdx/ui` cutover

**Status:** Accepted — 2026-07-31  
**Knowledge:** `knowledge/ui-rebuild-msqdx-ui.md`  
**Target DS:** `@msqdx/ui` + `@msqdx/ui-tokens` (sibling `msqdx-ui`)  
**Not:** real MUI · not `@msqdx/react` for finished surfaces

## Goal

Migrate every Plexon magazine / workstation surface onto `@msqdx/ui`, then delete the temporary bridges.

## Wave order

| Wave | Spec | Route(s) |
|------|------|----------|
| 0 | `app-shell.md` + auth pages | shell · `/login` · `/register` · password |
| 1 | `ui-migrate-dashboard.md` | `/` |
| 2 | `ui-migrate-settings.md` | `/settings` |
| 3 | `ui-migrate-products.md` | `/products` · `/projects/[id]` |
| 4 | `ui-migrate-admin.md` | `/admin*` |
| 5 | `ui-migrate-assistant.md` | `/assistant*` |
| 6 | `ui-migrate-event-quick-check.md` | `/event-quick-check*` |
| 7 | `ui-migrate-board.md` | `/board*` · bridge removal |

## Global rules (every wave)

1. Spec first — update the wave spec before code.
2. Import UI only from `@msqdx/ui` (barrels `lib/msqdx-ui.ts` / `lib/msqdx-ui-shell.ts`).
3. No new `@mui/material` or `@msqdx/react` imports on migrated files.
4. No hardcoded routes — `lib/shell-paths.ts` / `lib/constants.ts` / `knowledge/paths.md`.
5. Backend, NextAuth, Drizzle, federation APIs unchanged.
6. Definition of done: no legacy imports in the wave file set · smoke test · `npm run build` still green for that slice.

## Temporary bridges (delete in Wave 7)

| Alias | File | Purpose |
|-------|------|---------|
| `@msqdx/react` | `lib/msqdx-react-bridge/` | Legacy magazine + Prismion until cutover |
| `@mui/material` | `lib/mui-shim.tsx` | Stub only — **not** real MUI |
| `@msqdx/tokens` | legacy DS tokens path | Board Prismion only |

Do **not** expand bridges for new work. Prefer migrating the importing file.

## Agent checklist per wave

1. Read the wave spec.
2. List files still importing `@msqdx/react` / `@mui/material`.
3. Replace primitives with `@msqdx/ui` equivalents (`Text`, `Button`, `Field`, `Input`, `Panel`, `SectionChrome`, …).
4. Keep behavior/API contracts identical.
5. Add/adjust `__tests__` smoke.
6. Update progress table in `knowledge/ui-rebuild-msqdx-ui.md`.
