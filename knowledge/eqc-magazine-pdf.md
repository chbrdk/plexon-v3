# Quick Check — Magazin-PDF

Print export that mirrors the EQC magazine screen rhythm (not the legacy `pdf/msqdx` report kit).

## Engine

`@react-pdf` · document: `lib/assistant/reports/pdf/eqc-magazine-pdf.tsx`  
**Mag primitives SSOT:** `@msqdx/ui/mag` (`msqdx-ui/packages/ui/src/mag/`) — P78  
**App-local:** packing `lib/assistant/reports/pdf/magazine/pack-magazine-pages.ts`, report models/copy, `MsqdxLogoPdf` injected into `MagPage`  
Thin re-exports (compat): `lib/assistant/reports/pdf/magazine/index.ts` → `@msqdx/ui/mag`  
**Not this pipeline:** Creation composition → PDF lives in creation-v3 (`lib/magazine-pdf/`) — separate scene adapter, not an extension of EQC packing.

## Chapter map (screen → PDF)

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

Visibility follows `resolveEventQuickCheckDashboardLayout`. Interactive chrome (present, share, chat, model switcher) is omitted; GEO prompts use a static snapshot.

## Design language

Eyebrow → headline → meta → visual anchor (ring / donut / ledger) → body.  
No generic card stacks from the old kit. Accent `#00ca55`, white paper, DE copy.

**Satzspiegel:** äußere Ränder ~56pt, zentrierte Content-Spalte **428pt**. Soft-Paper `#f8f7f4` (Print-Stock, nicht reines Weiß).  
**Typo:** Noto Sans (fonts in DS `packages/ui/src/mag/fonts/`). Kompakte Größen (Cover ~22pt, Chapter ~14pt, Body ~8.5pt / lh 1.62), großzügiger vertikaler Rhythmus.  
**Folio:** Haarlinie + Uppercase-Meta + `n — total` unten.

**Magazin-Layout:** Kapitelindex `01…`; Spreads via `MagTwoColumn`; `MagPullQuote` für Fazit/E-E-A-T-Reasoning; Personas mapped to `MagPersonaCardModel` + EQC labels at the document layer.

**Page packing:** `pack-magazine-pages.ts` schätzt Kapitel-Gewicht und packt leichte Module (max. 3, Breathing ~12%). Cover bleibt solo.

**Text containment:** Zweispaltigkeit immer `50%` + Innen-Padding — **nie** `%`-Breite zusammen mit Flex-`gap`.

## Out of scope (Wave 1 / P78)

HTML/Playwright print engine · Creation Composition → PDF · PPTX redesign · present-mode PDF

## Storybook / twins

HTML visual twins: `msqdx-ui` catalog layer `Print/` · twin matrix `msqdx-ui/knowledge/print-magazine-twins.md` · shared colors `magazine/colors.ts`
