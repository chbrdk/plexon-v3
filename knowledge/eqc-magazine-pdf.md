# Quick Check — Magazin-PDF

Print export that mirrors the EQC magazine screen rhythm.

## SSOT (Phase 5)

**Creation published MagazineTemplate** is the authoring SSOT for Collection-scoped Mag layout (`role: quick-check-magazine`).  
Plexon binds `EventQuickCheckReportModel` into scene `props.dataSlot` targets and renders via Creation `POST /api/scenes/:id/pdf`.

| Concern | Path |
|---------|------|
| Spec | `specs/domain/creation-magazine-template-consume.md` |
| Paths | `lib/paths/creation-magazine-templates.ts` · env `EQC_CREATION_MAGAZINE_TEMPLATE` · `CREATION_API_URL` / `NEXT_PUBLIC_CREATION_URL` via `getCreationServiceApiUrl()` |
| Client | `lib/integrations/creation-magazine-template-client.ts` |
| Slot bind | `lib/assistant/reports/pdf/magazine/bind-eqc-report-slots.ts` |
| Wire | `lib/assistant/reports/render-assistant-report-pdf-local.tsx` |
| Upstream | `creation-v3/knowledge/magazine-template-publish.md` |

## Legacy fallback (deprecated)

`@react-pdf` document: `lib/assistant/reports/pdf/eqc-magazine-pdf.tsx`  
Used when Creation template prefer is off (`EQC_CREATION_MAGAZINE_TEMPLATE=0`), Creation URL unset, no published template, or Creation PDF fails.

**Mag primitives SSOT:** `@msqdx/ui/mag` (`msqdx-ui/packages/ui/src/mag/`)  
**App-local packing (legacy):** `lib/assistant/reports/pdf/magazine/pack-magazine-pages.ts`  
Thin re-exports: `lib/assistant/reports/pdf/magazine/index.ts` → `@msqdx/ui/mag`  
Creation composition → PDF adapter lives in creation-v3 (`lib/magazine-pdf/`). Twin: `msqdx-ui/knowledge/print-magazine-twins.md`.

## Chapter map (screen → legacy PDF)

| Screen band | PDF chapter key |
| --- | --- |
| Masthead + KPIs | `cover` |
| Markt & Trends | `market` |
| Domain & Barrierefreiheit | `domain` |
| Verteilungen | `distributions` |
| Domain-Vergleich | `domain-comparison` |
| Persona(s) | `persona` |
| GEO core | `geo` |
| E-E-A-T | `eeat` |
| GEO-Empfehlungen | `geo-recs` |
| Einschätzung | `insights` |
| Anhang | `appendix` |

Visibility follows `resolveEventQuickCheckDashboardLayout`. Interactive chrome omitted.

## Design language (legacy kit)

Eyebrow → headline → meta → visual anchor → body. Accent `#00ca55`, Soft-Paper `#f8f7f4`. Mag packing via `pack-magazine-pages.ts`.

## Out of scope

HTML/Playwright print · PPTX redesign · present-mode PDF
