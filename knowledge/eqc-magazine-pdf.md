# Quick Check — Magazin-PDF

Print export that mirrors the EQC magazine screen rhythm (not the legacy `pdf/msqdx` report kit).

## Engine

`@react-pdf` · document: `lib/assistant/reports/pdf/eqc-magazine-pdf.tsx`  
Primitives: `lib/assistant/reports/pdf/magazine/`

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

**Satzspiegel:** äußere Ränder ~52pt, zentrierte Content-Spalte **440pt** (nicht voller Seitenrand).  
**Typo:** Noto Sans (DS-Stack-Twin via `magazine/fonts/`), nicht Helvetica. Kompaktere Größen (Headline ~15pt, Body ~9pt), mehr vertikaler Rhythmus.

**Magazin-Layout:** `MagRankedList columns={2}` für Findings, Issues, GEO, E-E-A-T, Empfehlungen. Personas via `MagPersonaGrid` — 2-up Kacheln, bei einer Persona Goals | Pain side-by-side (`MagPersonaCard spread`).

## Out of scope (Wave 1)

HTML/Playwright print engine · PPTX redesign · present-mode PDF · full interactive GEO dossier parity

## Storybook

HTML visual twins live in `msqdx-ui` under catalog layer `Print/` (tokens aligned with `pdf/magazine/tokens.ts`).
