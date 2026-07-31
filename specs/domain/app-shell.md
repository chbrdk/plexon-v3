# App Shell

**Status:** Accepted — 2026-07-31  
**Implements:** `components/AppShell.tsx` · `lib/shell-paths.ts`  
**DS:** `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle` from `@msqdx/ui`  
**Index:** `specs/domain/ui-migrate.md`

## Rules

- Shared chrome only via `@msqdx/ui` (server barrel `lib/msqdx-ui.ts`, shell barrel `lib/msqdx-ui-shell.ts`).
- Composition language: `app-frame`, atmospheric background, floating rail, top-right brand corner, quiet topbar.
- Topbar: `PageTitle` + optional `TopStatus` / actions / `leading`.
- Primary nav: Dashboard · Assistant · Event Quick Check · Products · Board (admin) · Admin (admin).
- Settings rail footer: → `paths.routes.settings`; avatar from session display name.
- No MUI and no `@msqdx/react`.
- Routes and dock keys from `paths` / `lib/constants` — never hardcode.

## Layout notes

- Dashboard / Products / Settings / Admin are full-width magazine pages.
- Assistant and Event Quick Check are full-height workstation surfaces.
- Auth routes (`/login`, `/register`, `/forgot-password`, `/reset-password`) render outside the shell.

## Acceptance

1. Shell works at desktop and stacks on narrow widths.
2. Shared package styles imported once via `styles/globals.css`.
3. Rail marks active for `/`, `/assistant*`, `/event-quick-check*`, `/products*`, `/board*`, `/admin*`, `/settings*`.
