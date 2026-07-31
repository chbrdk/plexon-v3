# UI rebuild — Products + Platform projects

**Status:** Accepted — Wave 3 done — 2026-07-31 (challenge + reuse)  
**Routes:** `/products` · `/projects/[platformProjectId]`  
**Implements:** `app/products/page.tsx` · `components/products/**` · `app/projects/[platformProjectId]/page.tsx`  
**DS:** `SectionChrome`, `Panel`, `Text`, `Button`, `Chip`, `Spinner`, `Alert`, `StatLede`

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Product catalog grid + launch | **keep** | Already `@msqdx/ui` (`ProductCatalog`) |
| Runtime / access chips | **keep** | Chip status tones |
| Federated entry-point open | **keep** | Same `buildFederatedLaunchHref` / paths |
| Platform project name / status / domain | **reshape** | SectionChrome + Chip + Text (no MUI h4) |
| CHECKION / AUDION summaries | **reshape** | Panel bands + StatLede; external open via Button |
| Product bindings list | **keep** | Compact list + sync Chip |
| Loading / error | **reshape** | Spinner + Alert |
| Boxed MUI cards / Typography / Link | **drop** | No `@mui` / `@msqdx/react` |
| New sync UI on detail | **drop** (this wave) | Sync API stays; admin/provisioning owns sync UX |

## Reuse map

- Magazine: `SectionChrome` + `Panel` like products / settings pages.
- Stats: `StatLede` for scan / persona counts.
- Actions: `Button` primary/ghost; no MUI `Link`.

## File set

- `app/products/page.tsx`
- `components/products/ProductCatalog.tsx`
- `components/products/PlatformProjectDashboard.tsx`
- `app/projects/[platformProjectId]/page.tsx`

## Acceptance

1. Keep/reshape/drop reflected in UI.
2. Zero `@mui` / `@msqdx/react` in products + platform project file set.
3. Catalog and detail still use `PATH_PRODUCTS` / `pathPlatformProject` / dashboard API.
4. Smoke: contract test on project page imports + SectionChrome.
5. Progress Wave 3 → done.
