# Assistant domain specialists (internal)

**Status:** Accepted — Wave 2 2026-09-25  
**Owner:** PLEXON v3 (orchestrator)  
**Surfaces:** Free-chat only (`runAssistantAgent`) — same `/assistant` + `/assistant/embed` conversation  
**Companions:** `knowledge/plexon-assistant-orchestrator.md` · `specs/domain/capability-catalog.md` · `lib/assistant/assistant-planner.ts`

## Purpose

Formalize **internal domain specialists** behind the single Platform Assistant chat:

- One user-facing conversation and UI (no second chats, no agent pills).
- Planner picks an intent; a **Specialist registry** supplies the domain prompt addendum (and documents canonical tool families).
- Execution stays one tool loop (`orchestrator-complete`) with planner-filtered MCP tools.

## Specialist vs Capability vs Persona chat

| Layer | Role |
|-------|------|
| Specialist | Free-chat prompt + family focus for a plan intent |
| Capability Catalog | Shared executable contract Chat ↔ Collection Flow |
| Audion `/chat` | Persona voice — **not** a Platform Specialist |

## Registered specialist IDs

Specialist id **equals** `AssistantPlan.intent` for these intents:

### Wave 1

| Id | Label | Canonical families (planner SoT) |
|----|-------|----------------------------------|
| `metron_analytics` | Metron | `METRON_ANALYTICS_FAMILIES` (+ write when gated) |
| `checkion_scan` | Checkion Scan | `SCAN_FAMILIES` |
| `creation_scene_edit` | Creation Scene | `CREATION_SCENE_EDIT_*` (+ Spirion when gated) |

### Wave 2

| Id | Label | Canonical families (planner SoT) |
|----|-------|----------------------------------|
| `videon_media` | Videon | `VIDEON_MEDIA_FAMILIES` |
| `brandion_brand` | Brandion | `BRANDION_BRAND_FAMILIES` |
| `echon_market` | Echon | `ECHON_MARKET_FAMILIES` |

All other intents (`general_chat`, `audion_persona`, …) resolve **no** specialist — agent stacks product connectivity blocks (built **after** the plan, using plan-narrowed MCP flags).

## Contract

```ts
type AssistantSpecialistId =
  | 'metron_analytics'
  | 'checkion_scan'
  | 'creation_scene_edit'
  | 'videon_media'
  | 'brandion_brand'
  | 'echon_market'

type AssistantSpecialist = {
  id: AssistantSpecialistId
  label: string
  /** Documented families; planner remains SoT for the live plan. */
  toolFamilies: ToolFamily[]
  buildSystemAddendum(ctx: SpecialistContext): string | Promise<string>
  maxToolRounds?: number
}
```

- `resolveSpecialist(intent)` → specialist or `null`.
- When a specialist is active, the agent injects **only** that specialist’s addendum (plus base system prompt / retrieval / plan block) — not the full product connectivity stack.
- Connectivity / addenda are built **after** planning so unused product blocks are skipped.
- Planner metadata / SSE `plan` events include `specialistId` + `specialistLabel`; `PlannerStepCard` surfaces the label in the activity trace.

## Non-goals

- Visible multi-agent UI or parallel LLM subagent rounds
- Merging Audion persona chat into the Platform Assistant
- Changing Capability Catalog or Collection Flow

## Done when

1. Spec + orchestrator knowledge document Wave 1 + Wave 2.
2. `lib/assistant/specialists/*` registry ships all six profiles.
3. `runAssistantAgent` resolves and awaits specialist addenda; planner meta exposes specialist id/label.
4. Activity UI shows specialist label on the planner card.
5. Unit/smoke tests cover Wave-1 + Wave-2 resolve + planner intents.
