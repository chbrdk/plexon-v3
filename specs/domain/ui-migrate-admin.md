# UI rebuild — Admin console

**Status:** Accepted — Wave 4 done — 2026-07-31 (challenge + reuse)  
**Routes:** `/admin` · `/admin/users` · `/admin/companies` · `/admin/companies/[companyId]`  
**Implements:** `app/admin/**` · `components/admin/**`  
**DS:** `SectionChrome`, `Field`, `Input`, `Select`, `Button`, `Chip`, `Alert`, `Spinner`, `StatLede`, `Text`, `Checkbox`

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Admin gate (role + layout) | **keep** | Already `@msqdx/ui` |
| Subnav + last-visited | **reshape** | Active link via `--accent` CSS; drop inline theme-accent sx |
| Overview stats + deep links | **reshape** | StatLede + SectionChrome; federation contract meta |
| Users list / search / delete | **keep** | Semantic table + Field search |
| Users “full edit” → dashboard | **keep** (this wave) | Capability still on home; revisit with dashboard challenge |
| Companies create | **reshape** | Field + Input + Button band |
| Companies bulk inline edit + select | **keep** | Table + Input cells + Checkbox |
| Company detail: edit / members / projects / sync / delete | **keep** | Same APIs; Field/Select chrome |
| MUI Stack/Box + MsqdxCard/FormField | **drop** | No `@mui` / `@msqdx/react` |

## Reuse map

- Settings-style SectionChrome bands + Field stacks.
- Products-style Panel only for interactive project rows.
- Tables: semantic `<table class="plexon-admin-table">`, not MUI Table.

## File set

- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/companies/page.tsx`
- `app/admin/companies/[companyId]/page.tsx`
- `components/admin/AdminSubnav.tsx`

## Acceptance

1. Keep/reshape/drop reflected in UI.
2. Zero `@mui` / `@msqdx/react` in admin file set.
3. Admin gate / role checks unchanged.
4. Smoke: contract test on admin pages.
5. Progress Wave 4 → done.
