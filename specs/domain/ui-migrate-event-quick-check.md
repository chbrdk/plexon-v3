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
| **Done results / dashboard** | **reshape** (Wave 7 + Wave 8 scrolly) | `plexon-magazine plexon-eqc-results` + DS-only bands; **Wave 8:** cover `70svh`; content bands ≥ `100svh`; scroll-snap `proximity`; gap `50vh` tall↔tall / `20vh` if either neighbor is short |
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
| Results sections | `plexon-dash-band` + `SectionChrome` + DS body (`StatLede`, `RankedList`, `Alert`, …); GEO core, **E-E-A-T**, and **GEO-Empfehlungen** are separate scrolly chapters |
| **Distributions** (after Domain) | **reshape** | Checkion-parity corpus donuts (Readability / Eco grades / Link mix) from `GET /api/domain-scans/:id/overview`; own band before Domain-Vergleich |
| KPIs | `StatLede` / `StatLedeGroup` |
| Forms | `Field` / `Input` / `Textarea` / `ToggleGroup` |
| Charts | Recharts with theme ticks (`--ink` / `--muted` / `--line`) |

## Acceptance

1. No `@mui/material` or `@msqdx/react` in EQC file set. ✅  
2. Workflow APIs and report deep-links unchanged. ✅  
3. Done view uses `plexon-magazine` + DS primitives only (`SectionChrome`, `StatLede`, `RankedList`, …); no `assistant-ui` / `Ui*` imports on the dashboard path. ✅  
4. Domain/GEO workflows call v3 clients (not legacy `/api/scan/domain` / `/api/scan/geo-eeat`). ✅  
5. Results theming uses `--ink` / `--muted` / `--line` (not `--color-text-on-light` / `--color-card-bg`). ✅  
6. Results scrollytelling: cover `.plexon-eqc-masthead-shell` ≥ `70svh`; content `.plexon-dash-band` ≥ `100svh`; scroll-snap on `.plexon-eqc-results-scroll`; adaptive gap (`50vh` / `20vh` via `data-eqc-chapter`). ✅  
7. E-E-A-T and GEO-Empfehlungen are own magazine bands (not nested inside the GEO spread). ✅  
8. Distributions band (Readability / Eco / Link mix donuts) sits after Domain & Barrierefreiheit when overview aggregates exist; WCAG donut out of scope. ✅ 

## Progressive (not blockers)

- ReviewGate may still wrap on `UiBlockSurface` (workflow island)  
- Generative assistant-ui organisms remain for **chat** report sections only (`EventQuickCheckReportSections`)  
- Deep scan complete-depth still uses project `domain-scan-all` (documented)

## Next slice — Persona chat overlay (Wave C5)

**Priority:** EQC product slice after Capability Catalog C4. **Overlay + guest budgets: landed.**

| Item | Spec |
|------|------|
| Decision | Audion SoT via iframe overlay — not a second chat stack — `eqc-as-collection-flow.md` § Persona talk · `capability-catalog.md` Wave C5 · Audion `chat-embed.md` |
| UI | Persona band: primary CTA opens `EqcPersonaChatOverlay` (`data-testid=eqc-persona-chat-cta`); secondary deep-link |
| URL | Embed: `resolveEqcPersonaChatEmbedHref` → `/chat/embed?…`; fallback: `resolveEqcPersonaChatHref` → `/chat?…` |
| Surfaces | Authenticated magazine + public `/share/quick-check/[token]` |
| Tests | `__tests__/eqc-persona-chat-href.test.ts` (+ overlay CTA smoke) |
| Knowledge | `knowledge/eqc-persona-chat.md` |
| Still open | Optional Assistant chip; optional `audion.persona_chat` catalog stub |
