# Quick Check: GEO-Fragen nachträglich ändern

Stand: 2026-07-22

## Feature

Nach einem abgeschlossenen Quick Check / Komplettscan:

1. Button **„GEO-Fragen ändern“** im Report-Dashboard
2. Fragen bearbeiten (inkl. Persona-Gruppen)
3. **„Fragen bestätigen & GEO erneut starten“** → nur GEO-Job neu, Personas/Deep Scan bleiben
4. **„Zurück zum Report“** bricht ab

## Voraussetzungen

`canRerunGeo` nur wenn im Run-State vorhanden:

- `checkpoint` (Resume vor GEO)
- `report`
- Fragen (Draft / Confirmed / Report)

**Hinweis:** Alte Läufe vor dem Persistence-Fix haben oft keinen Checkpoint mehr → Button fehlt. Neue Läufe speichern Checkpoint + Fragen beim Abschluss.

## APIs

| Aktion | Route |
|--------|--------|
| Reopen / Cancel | `POST …/runs/:id/geo-questions/reopen` `{ cancel?: boolean }` |
| Confirm + neu | `POST …/runs/:id/geo-questions` `{ questions, groups? }` |

## Code

- `lib/assistant/event-quick-check/reopen-geo-questions.ts`
- `lib/assistant/event-quick-check/resolve-geo-questions-reopen-draft.ts`
- Completion in `execute-event-quick-check-page.ts` speichert `…stored` inkl. Checkpoint
