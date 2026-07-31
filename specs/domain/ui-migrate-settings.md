# UI rebuild — Settings

**Status:** Draft — Wave 2 (challenge + reuse)  
**Route:** `/settings`  
**Reference:** `audion-v3` settings · `knowledge/ui-rebuild-reuse.md`  
**DS:** `SectionChrome`, `Field`, `Input`, `Select`, `Switch`, `ToggleGroup`, `Text`, `Panel`, `Button`, `Avatar`

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Profile name / avatar | **keep** | Field + Avatar like Audion |
| Locale | **reshape** | `ToggleGroup` (en/de), not legacy select chrome |
| Brand / accent color | **keep** | Rebuild selector on `@msqdx/ui` (auth selector pattern) |
| Theme | **reshape** | Align with Audion `data-theme` + ToggleGroup if present; drop MUI theme leftovers |
| Password / security | **keep** if API exists | Panel + Button; challenge copy/UX |
| API tokens | **keep** if present | List + create/revoke on Field/Dialog — mirror Audion tokens band if any |
| Legacy Msqdx/MUI form chrome | **drop** | No bridge imports |

## Reuse map

- Audion `settings-page` composition: SectionChrome bands, Field stack, ToggleGroup.
- Plexon auth `AuthBrandColorSelector` pattern for brand (already `@msqdx/ui`).

## File set

- `app/settings/page.tsx`
- `components/settings/**`

## Acceptance

1. Keep/reshape/drop table above reflected in UI.
2. Zero `@mui` / `@msqdx/react` in file set.
3. Prefs persist as today where kept.
4. Smoke: settings heading + one field.
5. Progress Wave 2 → done.
