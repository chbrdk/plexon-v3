# UI migrate — Admin console

**Status:** Draft — Wave 4 (layout partial)  
**Routes:** `/admin` · `/admin/users` · `/admin/companies` · `/admin/companies/[companyId]`  
**Implements:** `app/admin/**` · `components/admin/**`

## Current state

- `app/admin/layout.tsx` + `AdminSubnav` on `@msqdx/ui`.
- Index / users / companies pages still bridge.

## Target composition

| Surface | Treatment |
|---------|-----------|
| Subnav | already `@msqdx/ui` `Text` + links |
| Tables / lists | semantic table or `RankedList` — not MUI Table |
| Forms | `Field` / `Input` / `Select` / `Button` |
| Feedback | `Alert` / `Spinner` |

## File set

- `app/admin/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/companies/page.tsx`
- `app/admin/companies/[companyId]/page.tsx`
- `components/admin/**` (except already-migrated subnav)

## Acceptance

1. No legacy imports in admin file set.
2. Admin gate / role checks unchanged.
3. Progress table Wave 4 → done.
