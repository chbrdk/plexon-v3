# Assistant · Journey Generate Intent

**Status:** Accepted — 2026-08-11  
**Depends:** `specs/domain/assistant-journey-outline.md` · Audion `POST /api/ai/journeys/generate`  
**Builder:** `buildJourneyDetailLayout` (interactive `phase_strip` with embedded moments)

## Goal

Deterministic intent that **creates** an AUDION Customer Journey (AI stub/native), then shows the same outline UI as `journey_outline` (optional validate).

## Intent

| Field | Type | Notes |
|-------|------|--------|
| `type` | `'journey_generate'` | |
| `journeyType` | `string?` | Default `customer` |
| `targetGroupName` | `string?` | Match catalog TG; else first / none |
| `validate` | `boolean?` | Default **true** after generate |

## Routing (examples)

- `Generiere Journey`
- `Erstelle eine Customer Journey`
- `Nutzerreise anlegen`
- `Journey generate für Zielgruppe …`

Requires Collection `platformProjectId` (Audion mirror via catalog `externalProjectId` or binding).

## Flow

1. Resolve Audion `project_id` (+ optional `target_group_id`) from platform catalog / binding.
2. `POST {AudionPlatformApi}/ai/journeys/generate` with `{ project_id, target_group_id?, journey_type }`.
3. `GET …/journeys/{id}` for phases/moments.
4. Optional validate (default on) → quotes/findings/recs.
5. Compose interactive outline (`phase_strip.moments` + client phase switch).

## Paths

- `audionPlatformJourneyGenerate` → `POST /api/ai/journeys/generate`
- Reuse `audionPlatformJourneyById` / `audionPlatformJourneyValidate`

## Out of scope

- Phase-moment-only generate (`…/phase/generate`)
- UX agent Study/Wave jobs
