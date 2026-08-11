# Assistant · Journey Outline Intent

**Status:** Accepted — 2026-08-11  
**Depends:** `knowledge/assistant-chat-blocks-msqdx-ui.md` · Audion `specs/api/journeys.md`  
**Builder:** `lib/assistant/ui-blocks/build-journey-outline-ui.ts` (`buildJourneyDetailLayout`)

## Goal

Deterministic assistant intent that loads an AUDION Customer Journey (phases + moments) and composes generative UI — analogous to `persona_bootstrap`.

## Intent

| Field | Type | Notes |
|-------|------|--------|
| `type` | `'journey_outline'` | |
| `journeyId` | `string?` | Prefer when present (`journey-…` / UUID) |
| `journeyName` | `string?` | Match against catalog name (case-insensitive contains) |
| `validate` | `boolean?` | When true, call Audion validate and attach quotes / findings / recs |

## Routing (examples)

- `Zeige Journey Outline`
- `Zeig mir die Customer Journey`
- `Nutzerreise Übersicht`
- `Journey validieren` / `Validiere die Journey`

Requires a Collection `platformProjectId` in conversation context unless `journeyId` is explicit.

## Flow

1. **Resolve** — explicit `journeyId`, else Audion platform catalog (`fetchAudionPlatformProjectSummary`) → pick by name or first journey.
2. **Fetch** — `GET {AudionPlatformApi}/journeys/{id}` → phases + elements.
3. **Validate (optional)** — `POST …/ai/journeys/{id}/validate` with catalog persona ids; map friction → `quote_list` / `finding_list` / `recommendation_list`.
4. **Compose** — `buildJourneyDetailLayout` + deep link `buildAudionJourneyUrl`.

## UI blocks

`phase_strip` · `moment_list` · optional `quote_list` / `finding_list` / `recommendation_list` · `link_list` (AUDION open).

## Paths

Documented in `knowledge/paths.md` · helpers in `lib/paths/audion-api.ts`:

- `audionPlatformJourneyById`
- `audionPlatformJourneyValidate`

## Out of scope

- Study/Wave UX agent jobs (`audion-journey-client.ts`) — Collection Test Flow only.

## Interactive outline (2026-08-11)

`phase_strip` phases may embed `moments[]`. Plexon `UiPhaseStrip` uses DS `onPhaseActivate` to switch the Moments panel client-side (no separate static `moment_list` when moments are embedded). Generate: `specs/domain/assistant-journey-generate.md`.
