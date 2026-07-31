# UI migrate — Products + Platform projects

**Status:** Draft — Wave 3 (catalog partial)  
**Routes:** `/products` · `/projects/[platformProjectId]`  
**Implements:** `app/products/page.tsx` · `components/products/ProductCatalog.tsx` · `app/projects/[platformProjectId]/page.tsx`

## Current state

- Products page + `ProductCatalog` already on `@msqdx/ui`.
- Platform project detail still on bridge / `@msqdx/react`.

## Remaining work

1. Audit `components/products/**` for leftover legacy imports.
2. Migrate `app/projects/[platformProjectId]/page.tsx` to `SectionChrome` + `Panel` + `Text` + `Button`/`Chip`.
3. Keep entitlement / federation project APIs unchanged.

## Acceptance

1. No legacy imports under products + platform project detail file set.
2. Catalog and detail still open the same product / project URLs (`knowledge/paths.md`).
3. Progress table Wave 3 → done.
