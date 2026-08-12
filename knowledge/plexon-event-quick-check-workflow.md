# Quick Check Workflow (PLEXON)

Festes Playbook für Events/Demos: eine Unternehmens-URL → schneller Cross-Product-Check.

> **v3 Hinweis:** Die Oberfläche `/event-quick-check` ist in plexon-v3 **vorhanden** (Nav + APIs).  
> Wenn Runs scheitern oder der Flow „tot“ wirkt → Produkt-Env fehlt (nicht die Feature-Route).  
> Staging-Smoke: `knowledge/event-quick-check-staging-smoke.md` · Readiness-API: `GET /api/assistant/event-quick-check/readiness`.  
> Parity-Status: `knowledge/plexon-v3-parity-matrix.md`.  
> **CHECKION:** Domain-Scan = `/api/domain-scans`, GEO = `/api/geo-jobs` (v3). Deep-Scan (Komplett) weiterhin Projekt-`domain-scan-all`.  
> **Done-UI:** Magazine (`plexon-magazine plexon-eqc-results`), Workflow-Form bleibt Workstation.

## Trigger (Assistent)

Beispiel-Prompts:

- `Quick Check für https://example.com`
- `Quick check for https://example.com`
- `Schnellcheck acme.com`
- `Quick check für "Firma XY" https://firma.de`

Composer-Chip: **Quick Check** (dritter Chip nach Website-Audit und Launch Readiness).

Intent: `run_playbook` mit `playbookId: event_quick_check` (siehe `lib/paths/assistant-workflows.ts`).

## Standalone-Seite (ohne Chat)

Route: `PATH_EVENT_QUICK_CHECK` → `/event-quick-check` (`lib/paths/event-quick-check-page.ts`)

- URL-Eingabe + optionaler Projektname
- Live-Fortschritt via `apiAssistantWorkflowStream(runId)`
- Ergebnis: volles **Magazine-Dashboard** (`EventQuickCheckDashboardView` → `plexon-eqc-results`), nicht Chat-UiBlocks
- PDF/PPTX: `GET .../event-quick-check/runs/:runId/pdf|pptx`

API:

- `POST /api/assistant/event-quick-check/runs` — Run anlegen
- `POST /api/assistant/event-quick-check/runs/:runId` — Analyse ausführen
- `GET /api/assistant/event-quick-check/runs/:runId` — Status + Report

Der Chat-Playbook-Pfad bleibt parallel verfügbar.


| Schritt | Plattform-Projekt nötig? |
|---------|--------------------------|
| Domain-Scan (50 S.) | **Nein** — nur URL |
| GEO / E-E-A-T | **Nein** — CHECKION `projectId` ist optional |
| GEO-Fragen (Suggest) | **Nein** — nur URL |
| Research | Ja (CHECKION + AUDION Binding) |
| ECHON Markt-Research | **Aus** (`EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED = false` in `assistant-workflows.ts`) — zu langsam für Event-Demos; Code bleibt für späteres Re-Enable |
| AUDION Persona | Ja (AUDION-Projekt) |
| Persona-GEO-Fragen | Ja (Persona) |

Standalone im Assistenten: `GEO Analyse für https://example.com` — ohne Projekt.

Der Quick Check versucht ein Plattform-Projekt anzulegen (für Persona), **blockiert** Scan & GEO aber nicht, wenn AUDION fehlt.

## Ablauf

1. **Vorbereitung** — URL normalisieren, Projektname aus Domain oder Kontext
2. **Unternehmen recherchieren** — Homepage-Signale + optional LLM-Kurzprofil (vor CHECKION)
3. **Unternehmensprofil bestätigen** — Nutzer prüft/editiert, dann Fortsetzung (`POST …/company-brief`)
4. **Plattform-Projekt** — anlegen + CHECKION/AUDION sync (oder bestehendes Projekt nutzen)
5. … Scan, Persona …
6. **GEO-Fragen ableiten** — AUDION `POST /personas/{id}/geo-questions` (Persona-Stimme); CHECKION nur Wettbewerber-Hints; PLEXON-LLM nur Fallback
7. **GEO-Fragen bestätigen** — Nutzer prüft/editiert, dann LLM-Check (`POST …/geo-questions`)
8. **GEO / E-E-A-T** — CHECKION sendet bestätigte Fragen an LLMs
3. **AUDION einrichten** — expliziter Sync (AUDION zuerst), Domain am Projekt setzen falls leer
4. **Parallel**
   - **Research** — CHECKION + AUDION Website-Research (max. 90s AUDION-Poll)
   - **Domain-Scan** — 50 Seiten (`EVENT_QUICK_CHECK_SCAN_MAX_PAGES`)
5. **AUDION Persona** — `runPersonaBootstrap` im gebundenen AUDION-Projekt
6. **GEO-Fragen** — 3 persona-relevante Fragen; ohne Persona Fallback via CHECKION-Suggest
7. **GEO Competitive Check** — CHECKION GEO/E-E-A-T mit `queries` + `runCompetitive: true`
8. **Report** — UI-Layout mit Ampel, Persona, Fragen, Schritt-Tabelle

Optional (derzeit deaktiviert): **ECHON Markt-Research** — Flag `EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED`.

Bei fehlendem AUDION-Binding: Schritt `ensure_audion` schlägt fehl, UI zeigt Sync-Hinweis — Quick Check danach erneut starten.

## Zentrale Pfade & Konstanten

| Konstante | Datei |
|-----------|--------|
| `EVENT_QUICK_CHECK_PLAYBOOK_ID` | `lib/paths/assistant-workflows.ts` |
| `EVENT_QUICK_CHECK_SCAN_MAX_PAGES` (50) | dort |
| `EVENT_QUICK_CHECK_GEO_QUESTION_COUNT` (3) | dort |
| `EVENT_QUICK_CHECK_RESEARCH_MAX_MS` (90s) | dort |
| `EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED` | `false` | ECHON Markt-Research im Quick Check |
| `EVENT_QUICK_CHECK_ECHON_RESEARCH_MAX_MS` (240s) | dort | Nur wenn Flag `true` |
| ECHON Quick Check | `lib/assistant/event-quick-check/echon-quick-check-research.ts` |
| CHECKION GEO suggest API | `lib/paths/checkion-api.ts` → `checkionApiGeoEeatSuggestQueries()` |
| AUDION persona GEO questions | `lib/paths/audion-api.ts` → `audionApiPersonaGeoQuestions()` |
| Komplettscan + CHECKION-Reuse | `knowledge/plexon-quick-check-complete-scan-checkion-reuse.md` |

## Code-Entry-Points

- Playbook: `lib/assistant/playbooks/event-quick-check.ts`
- Runner: `lib/assistant/playbooks/run-event-quick-check.ts`
- GEO-Fragen: `lib/assistant/geo/build-persona-geo-questions.ts` → `fetchAudionPersonaGeoQuestions`
- UI: `lib/assistant/ui-blocks/build-event-quick-check-ui.ts`
- Handler: `lib/assistant/handlers/run-playbook.ts` (Branch `event_quick_check`)
- Stream: `patchWorkflowSteps` + `emitPhase` — Live-Updates in Schrittliste & Agent-Trace (`phaseDetail`)

## Report-Inhalt (UI + PDF)

Der Quick-Check-Report enthält neben der Ampel:

- **Domain-Scan:** Score, Fehler/Warnungen/Hinweise, Top-Issues-Tabelle, Scan-ID
- **AUDION Persona:** Traits-Tabelle, Ziele, Pain Points, Bio/Interessen (aus `profile`)
- **GEO:** Share-of-Voice-Score, GEO-Fitness, E-E-A-T-Dimensionen, Zitate (inkl. Wettbewerber im Zitations-Chart), Empfehlungen — Wettbewerber-Tabelle nur im Chat-/PDF-Report, nicht im Dashboard
- **Info-Tooltips:** `lib/assistant/event-quick-check/event-quick-check-section-help.ts` — je Kapitel im Dashboard (`UiBlockHeader` / Anhang)

Parsing: `lib/integrations/parse-geo-eeat-job-preview.ts` (CHECKION `payload`), `parse-audion-persona-profile.ts` (AUDION `PersonaResponse`).

- `__tests__/build-persona-geo-questions.test.ts`
- `__tests__/event-quick-check-ui.test.ts`
- `__tests__/event-quick-check-stream.test.ts`
- `__tests__/ensure-platform-product-bindings.test.ts`

## Voraussetzungen

- CHECKION + AUDION Service-Auth (`CHECKION_API_URL`, `PLEXON_SERVICE_SECRET`, AUDION-Integration)
- Für vollen Lauf: AUDION-Binding nach Projekt-Sync

## Statisches Report-Template (2026-06)

Der Quick Check liefert **einen** UiBlock `event_quick_check_report` mit festem `EventQuickCheckReportModel`:

- App: scrollender One-Pager + aufklappbarer Anhang (`EventQuickCheckReportView`)
- PDF: Magazin-Print (`EqcMagazinePdfDocument` in `lib/assistant/reports/pdf/eqc-magazine-pdf.tsx` + `pdf/magazine/` primitives). Kapitel folgen Screen-Bands (Cover, Domain, Verteilungen, Persona, GEO, E-E-A-T, Moves, Insights, Anhang). Siehe `knowledge/eqc-magazine-pdf.md`. Legacy `pdf/msqdx/` nur noch für nicht-EQC Assistant-PDFs.
- PPTX: `mapEventQuickCheckReportToSlides`
- Workflow: `buildEventQuickCheckReportLayoutFromQuick` in `run-playbook.ts`; Insights nur im Model, kein `appendInsightBlocksToLayout`

Siehe `knowledge/event-quick-check-report-template.md`.

## GEO LLM-Antworttext (2026-06)

- CHECKION speichert pro Competitive-Query `answerText` (Prosa, max. 4000 Zeichen) + `rawAnswerExcerpt` (JSON, max. 8000 Zeichen) in `payload.competitiveByModel[].runs`.
- PLEXON mappt das in `geo.citationHighlightsByModel[].runs` und persistiert es im `EventQuickCheckReportModel` (Historie / Dialog „Antwort anzeigen“).
- Limits: `GEO_COMPETITIVE_*` in CHECKION `lib/constants.ts` und PLEXON `lib/integrations/geo-competitive-answer-limits.ts`.
- Alte Runs ohne `answerText`: Fallback über `formatGeoLlmAnswerForDisplay` (JSON-`answer` oder formatierte Zitierungen).

## AUDION Persona auf Deutsch (2026-06)

- `runPersonaBootstrap` **lässt `output_locale` weg** — AUDION speichert Englisch in `profile` und Deutsch in `profile_de` (`buildAudionPersonaGenerateRequestBody`).
- `parseAudionPersonaResponse` merged `profile_de` / `headline_de` für die Anzeige (`outputLocale: "de"`).
- Bereits gespeicherte Reports mit englischen Persona-Texten brauchen einen neuen Quick Check.

