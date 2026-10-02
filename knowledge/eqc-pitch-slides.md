# EQC pitch slides (operator)

**Spec:** `specs/domain/eqc-pitch-slides.md` · Suite handoff `creation-magcloud-handoff.md`  
**Status:** Wave 2 start 2026-10-02

## Intent

Quickscan fertig → editable **16:9 CREATION** Folien → optional **Publish to Magcloud**.

## Operator path

1. EQC Run mit Report öffnen.
2. `POST /api/assistant/event-quick-check/runs/:runId/pitch-slides` (UI/Assistant) → `editorHref`.
3. In CREATION Headlines/Charts feilen (Print → Folie 16:9).
4. Export-Menü → **An Magcloud veröffentlichen**.

## Env

| Key | Role |
|-----|------|
| `CREATION_API_URL` / `NEXT_PUBLIC_CREATION_URL` | Materialize + editor link |
| `PLEXON_SERVICE_SECRET` | CREATION scene POST (service + actor) |
| Optional published template role | `quick-check-slides` on CREATION MagazineTemplates |

Without Creation base → API `503` `creation_unconfigured`. Fixture builder still unit-testable offline.
