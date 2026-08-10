# UI migrate — Event Quick Check

**Status:** Accepted — Wave 6 done — 2026-07-31 · **Wave 7 Results** accepted — 2026-08-06 · **Wave 8 scrollytelling** — 2026-08-10  
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
| **Done results / dashboard** | **reshape** (Wave 7 + Wave 8 scrolly) | `plexon-magazine plexon-eqc-results` + DS-only bands; **Wave 8:** each top-level results chapter ≥ `100svh` with vertical scroll-snap (`proximity`) for scrollytelling |
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
| Results sections | `plexon-dash-band` + `SectionChrome` + DS body (`StatLede`, `RankedList`, `Alert`, …) |
| KPIs | `StatLede` / `StatLedeGroup` |
| Forms | `Field` / `Input` / `Textarea` / `ToggleGroup` |
| Charts | Recharts with theme ticks (`--ink` / `--muted` / `--line`) |

## Acceptance

1. No `@mui/material` or `@msqdx/react` in EQC file set. ✅  
2. Workflow APIs and report deep-links unchanged. ✅  
3. Done view uses `plexon-magazine` + DS primitives only (`SectionChrome`, `StatLede`, `RankedList`, …); no `assistant-ui` / `Ui*` imports on the dashboard path. ✅  
4. Domain/GEO workflows call v3 clients (not legacy `/api/scan/domain` / `/api/scan/geo-eeat`). ✅  
5. Results theming uses `--ink` / `--muted` / `--line` (not `--color-text-on-light` / `--color-card-bg`). ✅  
6. Results scrollytelling: `.plexon-eqc-results-scroll` uses vertical scroll-snap; each direct child chapter (masthead shell + `.plexon-dash-band`) is ≥ `100svh`. ✅  

## Progressive (not blockers)

- ReviewGate may still wrap on `UiBlockSurface` (workflow island)  
- Generative assistant-ui organisms remain for **chat** report sections only (`EventQuickCheckReportSections`)  
- Deep scan complete-depth still uses project `domain-scan-all` (documented)
