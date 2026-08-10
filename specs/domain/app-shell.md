# App Shell

**Status:** Accepted — 2026-07-31; Central Assistant flyout — 2026-08-10  
**Implements:** `components/AppShell.tsx` · `components/PlatformAssistantHost.tsx` · `lib/shell-paths.ts`  
**DS:** `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, `ChatOverlay` from `@msqdx/ui`  
**Index:** `specs/domain/ui-migrate.md` · `specs/domain/central-assistant-flyout.md`

## Rules

- Shared chrome only via `@msqdx/ui` (server barrel `lib/msqdx-ui.ts`, shell barrel `lib/msqdx-ui-shell.ts`).
- Composition language: `app-frame`, atmospheric background, floating rail, top-right brand corner, quiet topbar.
- Topbar: `PageTitle` + optional `TopStatus` / actions / `leading`.
- Primary nav: Dashboard · Assistant · Event Quick Check · Products · Board (admin) · Admin (admin).
- Settings rail footer: → `paths.routes.settings`; avatar from session display name.
- No MUI and no `@msqdx/react`.
- Routes and dock keys from `paths` / `lib/constants` — never hardcode.
- Authenticated shell MUST mount `PlatformAssistantHost` (FAB + `ChatOverlay` → `/assistant/embed`). Rail **Assistant** deep-links to expand (`PATH_ASSISTANT`), not a second chat UX.

## Layout notes

- Dashboard / Products / Settings / Admin are full-width magazine pages.
- Assistant **expand** and Event Quick Check are full-height workstation surfaces.
- Platform Assistant **primary** entry is the dock-end flyout (see `central-assistant-flyout.md`).
- Auth routes (`/login`, `/register`, `/forgot-password`, `/reset-password`) render outside the shell (no assistant host).

## Acceptance

1. Shell works at desktop and stacks on narrow widths.
2. Shared package styles imported once via `styles/globals.css`.
3. Rail marks active for `/`, `/assistant*`, `/event-quick-check*`, `/products*`, `/board*`, `/admin*`, `/settings*`.
4. FAB opens the central assistant flyout; expand continues the same conversation.
