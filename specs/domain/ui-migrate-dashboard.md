# UI migrate — Dashboard

**Status:** Draft — Wave 1 challenge revisit  
**Route:** `/`  
**Implements:** `app/page.tsx` (+ optional `components/dashboard/*`)  
**Pattern:** magazine like Products / Audion — `SectionChrome` + `Text` + `Panel` + `Button`/`Chip`/`StatLede`

## Rebuild posture

Wave 1 removed legacy imports via adapters (`DashText`/`DashButton`/…). That is **not** the end state. Next pass must **challenge** density and admin-on-home patterns — not only restyle.

## Challenge — keep / reshape / drop (next pass)

| Capability | Decision | Notes |
|------------|----------|-------|
| Product teasers / ProductCatalog | **reshape** | Same collection magazine tiles as projects (`plexon-collection-card`) |
| Platform project insights | **keep** | Reshape cards to Panel/RankedList |
| Usage summary / chart | **reshape** | Keep data; simplify chrome; challenge admin+user mix on one page |
| Admin user CRUD on home | **challenge** | Prefer deep-link to `/admin/users` — home may only show entry CTA |
| Edit-user mega modal on `/` | **reshape** | Move to admin surface if kept |
| Local Dash* adapters | **drop** when sections rewritten | Use Text/Button/Panel directly |

## Current state

- No `@mui` / `@msqdx/react` imports.
- Still adapter-heavy; revisit before calling Wave 1 “done” for product quality.

## Acceptance (adapter pass — done)

1. Zero `@mui/material` / `@msqdx/react` imports in the file set.
2. Dashboard remains full-width magazine inside AppShell.
3. Existing dashboard API calls and navigation targets unchanged.
4. Smoke test: SectionChrome + ProductCatalog markers.

## Acceptance (challenge pass — pending)

1. Keep/reshape/drop table applied.
2. No Dash* adapters left (or only in a temporary `components/dashboard/adapters.tsx` with removal ticket).
3. Home is not a second admin console.

