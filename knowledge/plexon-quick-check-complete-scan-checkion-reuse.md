# Quick Check Komplettscan — CHECKION-Projektstrukturen wiederverwenden

Der **Komplettscan** (`depth: complete`) soll dasselbe leisten wie ein CHECKION-Projekt (Wettbewerber + Deep Scan aller Domains), orchestriert aus PLEXON — **ohne** die CHECKION-Logik zu duplizieren.

## Prinzip

| Verantwortung | System |
|---------------|--------|
| Wettbewerber speichern, Deep Scan starten, Scan-Daten | **CHECKION Projekt** |
| Personas, GEO-Fragen in Persona-Stimme | **AUDION** |
| Gates, Report, Async-Orchestrierung | **PLEXON** |

Quick Check (`depth: quick`) bleibt unverändert: 50 Seiten, 1 Persona, Wettbewerber nur für GEO-Zitate.

## CHECKION-APIs (1:1 wie Projekt-UI)

Pfade in PLEXON: `lib/paths/checkion-api.ts` (Spiegel von CHECKION `lib/constants.ts`).

| Schritt | CHECKION Route | PLEXON Client |
|---------|----------------|---------------|
| Wettbewerber vorschlagen | `POST /api/projects/{id}/suggest-competitors` | `suggestCheckionProjectCompetitors()` |
| Wettbewerber speichern | `PATCH /api/projects/{id}` `{ competitors: [...] }` | `updateCheckionProject()` |
| Deep Scan eigen + alle Wettbewerber | `POST /api/projects/{id}/domain-scan-all?maxPages=…` | `startCheckionProjectDomainScanAll()` |
| Fortschritt / Summaries | `GET /api/scan/domain/{id}/status` + Poll | `pollCheckionProjectDeepScans()` |
| Report-Vergleich | `GET /api/projects/{id}/domain-summary-all` | `fetchCheckionProjectDomainSummaryAll()` |
| GEO Competitive | `POST /api/scan/geo-eeat` mit `projectId` + `competitors` | bestehend `runGeoAnalysisWorkflow()` |

CHECKION-Doku (Quelle):

- `CHECKION/knowledge/checkion-domain-scan-max-pages.md`
- `CHECKION/knowledge/checkion-domain-scan-storage.md`
- `CHECKION/app/api/projects/[id]/domain-scan-all/route.ts`

## Scan-Tiefen (PLEXON)

Konstanten: `lib/paths/assistant-workflows.ts`

```typescript
resolveEventQuickCheckProfile('quick' | 'complete')
```

| Profil | Seiten | Personas | Wettbewerber-Scan | CHECKION-Projekt |
|--------|--------|----------|-------------------|------------------|
| `quick` | 50 | 1 | nein | optional |
| `complete` | 1000 | 3 (geplant) | ja, max. 3 | **pflicht** |

## Geplanter Ablauf Komplettscan

1. Company Brief Gate (existiert)
2. **Competitors Gate (neu)** — `suggest-competitors` → Nutzer wählt 3 Domains → `PATCH project.competitors`
3. Plattform-Projekt + CHECKION-Binding (Pflicht)
4. **3 Personas** — 3 AUDION Target Groups / Segmente aus Brief (`deriveBuyerSegments` + `runMultiPersonaBootstrap`)
5. GEO-Fragen Gate pro Persona (AUDION `geo-questions`, gruppiert im UI)
6. **`domain-scan-all`** statt Einzel-Scan — parallel poll aller Scan-IDs
7. GEO Check mit gespeicherten Wettbewerbern
8. Report + Link `pathCheckionProject(projectId)`

## Gates & Checkpoint

Analog zu `company_brief_confirm` / `geo_questions_confirm`:

- `competitors_confirm` — draft aus suggest, confirmed in Run-State
- Checkpoint speichert `checkionProjectId`, `competitorsConfirmed`, `deepScanStarted`

Run-Modi: `continue_after_competitors`, `after_geo` (wartet ggf. auf Deep Scan via `awaitingDeepScan`).

## Async Deep Scan (mehrstündige CHECKION-Crawls)

Problem: `domain-scan-all` mit 1000 Seiten × 4 Domains kann **Stunden** dauern — synchrones Polling in einem HTTP-Request ist nicht tragfähig.

**Lösung:** Deep Scan startet im Hintergrund; Personas & GEO-Gate laufen parallel; nach GEO-Bestätigung wartet ein **`awaitingDeepScan`**-Gate mit Poll (`GET/POST …/runs/:id/deep-scan`). Run kann über Verlauf wieder geöffnet werden.

## UI

- Modus-Auswahl auf `/event-quick-check`: Quick vs. Komplett
- Competitors-Panel wie CHECKION Projektseite (Chips, Vorschläge, manuell)
- Fortschritt: „2/4 Scans (67 %)“ via `fetchCheckionProjectDeepScanProgress`
- **Deep-Scan-Banner während GEO-Gate** (`EventQuickCheckDeepScanBanner`) — pollt `GET …/deep-scan` alle 15s
- CTA: „In CHECKION öffnen“ → `pathCheckionProject(id)` (Dashboard + Anhang)

## Implementierungsstand

| Baustein | Status |
|----------|--------|
| `EventQuickCheckDepth` + Profile | ✅ |
| CHECKION API-Pfade | ✅ |
| Competitors client (suggest + PATCH) | ✅ |
| Deep-scan client (domain-scan-all + poll) | ✅ |
| Competitors Gate UI + Runner | ✅ Phase 1b |
| Runner: complete branch statt 50-Seiten-Scan | ✅ domain-scan-all nach Gate |
| 3 Personas | ✅ Phase 3 |
| Report Multi-Domain | ✅ Phase 2 |
| Async Deep Scan Gate | ✅ Hintergrund-Scan + awaitingDeepScan |

## Tests

- `__tests__/event-quick-check-profiles.test.ts`
- `__tests__/checkion-project-competitors-client.test.ts`
- `__tests__/derive-buyer-segments.test.ts`
- `__tests__/persona-bootstrap-preview.test.ts`
- `__tests__/map-event-quick-check-domain-comparison.test.ts`
