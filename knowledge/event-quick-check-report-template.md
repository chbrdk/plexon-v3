# Quick Check — Statisches Report-Template

## Block-Typ

`event_quick_check_report` — ein UiBlock mit vollständigem `EventQuickCheckReportModel`.

## Sections (App scroll + PDF)

| Section | App | PDF Seite |
|---------|-----|-----------|
| Cover / Executive KPIs | oben | 1 |
| Domain & A11y | SectionDomain | 2 |
| AUDION Persona | SectionPersona | 3 |
| GEO Competitive | SectionGeo | 4 |
| Insights & Empfehlungen | SectionInsights | 5 |
| Anhang (collapsible) | SectionAppendix | 5/6 |

## Code

- Typen: `lib/assistant/reports/event-quick-check-report-types.ts`
- UI-Texte (DE): `lib/assistant/reports/event-quick-check-report-copy.ts`
- Model: `lib/assistant/reports/build-event-quick-check-report-model.ts`
- UiBlock: `lib/assistant/reports/build-event-quick-check-report-block.ts`
- App: `components/assistant/reports/EventQuickCheckReportView.tsx`
- PDF CHECKION: `CHECKION/components/pdf/EventQuickCheckReportPdfDocument.tsx`

## Pfade

Template-ID: `EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID` in `lib/paths/assistant-workflows.ts`
