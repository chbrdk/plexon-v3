# Plexon Assistant Report — PPTX Export (Phasenplan)

Kuratierter Assistenten-Report als MSQDX-PowerPoint — Spiegel der PDF-Pipeline.

## Phasen-Checkliste

| Phase | Inhalt | Status |
|-------|--------|--------|
| **0** | Plan, Fixture, Abnahmekriterien | ✅ |
| **1** | CHECKION: `build-plexon-assistant-pptx-plan` + API + Tests | ✅ |
| **2** | PLEXON: Route, Download-Button, Public View, i18n | ✅ |
| **3** | Charts native, Tabellen-Overflow, Smoke in PowerPoint | ✅ |
| **4** | Checkbox-Teilauswahl im Warenkorb (`pinIds`) | ✅ |
| **5** | Phase B: Rich Block-Mapper (Persona, KPI, Tabellen) | ✅ |

## Architektur

```
ReportCollectionBar / PublicReportView
  → GET /api/public/reports/{token}/pptx
  → renderAssistantReportPptx()
       1. CHECKION POST /api/integrations/plexon/assistant-report/pptx
       2. Fallback: pptxgenjs lokal in PLEXON
```

## Datenvertrag

Identisch zu PDF: `PlexonAssistantReportPayload` in `CHECKION/lib/integrations/plexon/assistant-report-types.ts`.

## Abnahmekriterien

- [x] PDF **und** PPTX nach „Report erstellen“ im Warenkorb
- [x] Public Share Page: beide Buttons
- [ ] PPTX öffnet ohne Reparatur-Dialog (manuell in PowerPoint)
- [x] Alle 15 UiBlock-Typen repräsentiert (Plan-Tests)
- [x] Kein Lorem ipsum aus Master-Platzhaltern (Smoke-Test)
- [x] IBM Plex Mono via CHECKION MSQDX-Pipeline
- [x] Tests: Plan + PK-Magic-Bytes
- [ ] Docker-Deploy CHECKION mit `assets/` (manuell)

## Pfade

| Repo | Pfad |
|------|------|
| CHECKION Plan | `lib/integrations/plexon/build-plexon-assistant-pptx-plan.ts` |
| CHECKION API | `app/api/integrations/plexon/assistant-report/pptx/route.ts` |
| PLEXON Orchestrator | `lib/assistant/reports/render-assistant-report-pptx.ts` |
| PLEXON API | `app/api/public/reports/[token]/pptx/route.ts` |
| Fixture | `CHECKION/lib/integrations/plexon/fixtures/assistant-report-ui-layout.fixture.ts` |

## Env

- `PLEXON_SERVICE_SECRET` — Service-zu-Service Auth
- `CHECKION_API_URL` — Basis-URL für CHECKION (PLEXON)

## Deploy

1. CHECKION zuerst deployen (`assets/report-templates/` im Image)
2. PLEXON danach — `CHECKION_API_URL` + `PLEXON_SERVICE_SECRET` gesetzt

## Debug (Slide-Plan)

Vor dem Rendern den Folien-Plan als JSON inspizieren:

| Endpoint | Auth |
|----------|------|
| `POST CHECKION /api/integrations/plexon/assistant-report/pptx?debug=plan` | `PLEXON_SERVICE_SECRET` |
| `GET PLEXON /api/public/reports/{token}/pptx?debug=plan` | Öffentlich (Share-Token) |

Antwort: `slideCount`, `emptySlideCount`, `slides[]` (Summary pro Folie), vollständiger `plan`.

Pfade: `lib/paths/plexon-assistant-export.ts` (CHECKION), `lib/paths/assistant-report-export.ts` (PLEXON).
