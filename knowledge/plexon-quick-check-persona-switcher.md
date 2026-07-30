# AUDION Personas im Quick-Check-Report durchschalten

Stand: 2026-07-22

## Problem

Komplettscan erzeugt bis zu **3 AUDION-Personas** (`report.personas`), die UI zeigte aber nur `report.persona` (= erste).

## Lösung

- Helper: `lib/assistant/reports/resolve-report-personas.ts`
- UI: Chip-Switcher in `EventQuickCheckPersonaSection` (wie GEO-Modell-Switcher)
- Pro Persona optional `geoQuestions` aus `geoQuestionsByPersona`
- PDF: alle Personas untereinander (kein Switcher nötig)
- Panel-Titel: „AUDION Personas“ wenn `personas.length > 1`
  
  t
## Datenfluss

```
AUDION multi bootstrap → personaPreview.personas
  → buildEventQuickCheckReportModel → model.personas[]
  → EventQuickCheckPersonaSection Chip-Switcher
```

