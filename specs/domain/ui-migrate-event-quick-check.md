# UI migrate — Event Quick Check

**Status:** Accepted — Wave 6 done — 2026-07-31 · **Wave 7 Results** accepted — 2026-08-06  
**Route:** `/event-quick-check*`  
**Implements:** `app/event-quick-check/**` · `components/event-quick-check/**`  
**Layout:** workflow = full-height workstation; **done results = magazine**

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Workflow phases (idle → review → geo → deep scan → dashboard) | **keep** | All page API routes unchanged |
| URL / project / depth form | **reshape** | `Field` + `Input` + `ToggleGroup` (Wave 6) |
| Review panels (brief, competitors, geo) | **reshape** | DS forms; logic unchanged |
| Deep scan poll + progress | **reshape** | CSS progress + `Spinner` |
| **Done results / dashboard** | **reshape** (Wave 7) | `plexon-magazine plexon-eqc-results` + `SectionChrome` / `StatLede` bands; no `UiBlockSurface` |
| Domain-Scan + GEO HTTP | **reshape** (Wave 7) | CHECKION v3 `/api/domain-scans` + `/api/geo-jobs` via adapters |
| Recharts charts | **keep** | Magazine chart chrome (no bridge card) |
| History | **reshape** | `@msqdx/ui` `Dialog` |
| PlexonPageChrome / AppHeaderV2 | **drop** | AppShell title is enough |
| MUI Box/Stack/Typography | **drop** | |

## Target composition

| Band | Treatment |
|------|-----------|
| Workflow shell | `plexon-eqc-stage` + Suspense `EmptyState` / `Spinner` |
| Done shell | `plexon-magazine plexon-eqc-results` |
| Results sections | `EventQuickCheckDashboardPanel` → `SectionChrome` + band body |
| KPIs | `StatLede` / `StatLedeGroup` |
| Forms | `Field` / `Input` / `Textarea` / `ToggleGroup` |
| Charts | Recharts inside `.plexon-eqc-chart-block` |

## Acceptance

1. No `@mui/material` or `@msqdx/react` in EQC file set. ✅  
2. Workflow APIs and report deep-links unchanged. ✅  
3. Done view uses `plexon-magazine` + `SectionChrome`; dashboard panel has no `UiBlockSurface` import. ✅  
4. Domain/GEO workflows call v3 clients (not legacy `/api/scan/domain` / `/api/scan/geo-eeat`). ✅  

## Progressive (not blockers)

- ReviewGate may still wrap on `UiBlockSurface` (workflow island)  
- Generative assistant-ui organisms used *inside* report sections remain progressive Wave-7 islands  
- Deep scan complete-depth still uses project `domain-scan-all` (documented)
