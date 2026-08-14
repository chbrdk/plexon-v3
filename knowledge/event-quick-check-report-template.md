# Quick Check — Statisches Report-Template

## Block-Typ

`event_quick_check_report` — ein UiBlock mit vollständigem `EventQuickCheckReportModel`.

## Sections (App scroll + Magazin-PDF)

| Section | App | PDF Kapitel |
|---------|-----|-------------|
| Cover / Masthead KPIs | Masthead | `cover` |
| Markt | Band | `market` |
| Domain & A11y | Domain magazine | `domain` |
| Verteilungen | Distributions | `distributions` |
| Domain-Vergleich | MagTable | `domain-comparison` |
| AUDION Persona | Persona hero | `persona` |
| GEO Competitive | GEO magazine | `geo` |
| E-E-A-T | Ledger | `eeat` |
| GEO-Empfehlungen | Moves | `geo-recs` |
| Insights | Insights | `insights` |
| Anhang | Appendix | `appendix` |

## Code

- Typen: `lib/assistant/reports/event-quick-check-report-types.ts`
- UI-Texte (DE): `lib/assistant/reports/event-quick-check-report-copy.ts`
- Model: `lib/assistant/reports/build-event-quick-check-report-model.ts`
- UiBlock: `lib/assistant/reports/build-event-quick-check-report-block.ts`
- App: `components/event-quick-check/EventQuickCheckDashboardView.tsx`
- PDF: `lib/assistant/reports/pdf/eqc-magazine-pdf.tsx` + Mag* via `@msqdx/ui/mag` + packing `lib/assistant/reports/pdf/magazine/pack-magazine-pages.ts`
- Spec: `knowledge/eqc-magazine-pdf.md`

## Pfade

Template-ID: `EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID` in `lib/paths/assistant-workflows.ts`
