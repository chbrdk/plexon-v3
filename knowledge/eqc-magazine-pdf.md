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

**Satzspiegel:** äußere Ränder ~56pt, zentrierte Content-Spalte **428pt**. Soft-Paper `#f8f7f4` (Print-Stock, nicht reines Weiß).  
**Typo:** Noto Sans. Kompakte Größen (Cover ~22pt, Chapter ~14pt, Body ~8.5pt / lh 1.62), großzügiger vertikaler Rhythmus.  
**Folio:** Haarlinie + Uppercase-Meta + `n — total` unten.

**Magazin-Layout:** Kapitelindex `01…`; Spreads via `MagTwoColumn` (Markt Überblick|Findings, Domain Score|Issues, GEO Competitors|Prompts); `MagPullQuote` für Fazit/E-E-A-T-Reasoning; Personas als Editorial-Tiles (Top-Hairline, keine Card-Box); Listen 2-spaltig wo sinnvoll.

## Out of scope (Wave 1)

HTML/Playwright print engine · PPTX redesign · present-mode PDF · full interactive GEO dossier parity

## Storybook

HTML visual twins live in `msqdx-ui` under catalog layer `Print/` (tokens aligned with `pdf/magazine/tokens.ts`).
