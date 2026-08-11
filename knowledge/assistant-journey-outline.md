# Assistant journey outline

**Date:** 2026-08-11  
**Spec:** `specs/domain/assistant-journey-outline.md`

## What

Intent `journey_outline` loads an AUDION Customer Journey and composes chat UI via `buildJourneyDetailLayout` (phases / moments / optional validate blocks).

## Files

| Piece | Path |
|-------|------|
| Intent + router | `lib/assistant/intent-router.ts` |
| Handler | `lib/assistant/handlers/journey-outline.ts` |
| Registry | `lib/assistant/workflow-registry.ts` |
| Client | `lib/integrations/audion-journey-outline-client.ts` |
| Paths | `audionPlatformJourneyById` · `audionPlatformJourneyValidate` in `lib/paths/audion-api.ts` |
| Steps | `JOURNEY_OUTLINE_INITIAL_STEPS` in `lib/assistant/ui-blocks/workflow-ui.ts` |

## Resolve order

1. Explicit `journeyId` in prompt (`journey-…` or UUID)
2. Else Collection `platformProjectId` → Audion provisioning catalog → name match or first journey
3. `GET /api/journeys/{id}` for phases/elements
4. Optional `POST /api/ai/journeys/{id}/validate` when prompt contains validate

## Not this

Study/Wave UX agent (`lib/integrations/audion-journey-client.ts`) stays Collection Test Flow only.

## Related

- Generate: `specs/domain/assistant-journey-generate.md` · `handlers/journey-generate.ts`
- Interactive: `knowledge/assistant-journey-interactive.md`
