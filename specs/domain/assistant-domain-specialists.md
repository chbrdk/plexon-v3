# Assistant domain specialists (internal)

**Status:** Accepted — Wave 3 2026-09-25  
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

### Wave 3

| Id | Label | Canonical families (planner SoT) |
|----|-------|----------------------------------|
| `checkion_seo_geo` | Checkion GEO | `GEO_FAMILIES` |
| `audion_persona` | Audion Persona | `PERSONA_FAMILIES` |
| `audion_ux_journey` | Audion UX Journey | `UX_JOURNEY_FAMILIES` |
| `spirion_research` | Spirion | `SPIRION_RESEARCH_FAMILIES` |
| `creation_design` | Creation Design | `CREATION_DESIGN_FAMILIES` |
| `echon_audience` | Echon Audience | `ECHON_TO_AUDIENCE_FAMILIES` |

All other intents (`general_chat`, `project_knowledge`, `action_write`, remaining Audion intents, …) resolve **no** specialist — agent stacks product connectivity blocks (built **after** the plan, using plan-narrowed MCP flags).

## Contract

```ts
type AssistantSpecialistId =
  | 'metron_analytics'
  | 'checkion_scan'
  | 'creation_scene_edit'
  | 'videon_media'
  | 'brandion_brand'
  | 'echon_market'
  | 'checkion_seo_geo'
  | 'audion_persona'
  | 'audion_ux_journey'
  | 'spirion_research'
  | 'creation_design'
  | 'echon_audience'

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
- `echon_audience` enables Audion + Echon (+ Checkion when entitled) MCP flags so audience-write tools load.

## Non-goals

- Visible multi-agent UI or parallel LLM subagent rounds
- Merging Audion persona chat into the Platform Assistant
- Changing Capability Catalog or Collection Flow

## Done when

1. Spec + orchestrator knowledge document Wave 1–3.
2. `lib/assistant/specialists/*` registry ships all twelve profiles.
3. `runAssistantAgent` resolves and awaits specialist addenda; planner meta exposes specialist id/label.
4. Activity UI shows specialist label on the planner card.
5. Unit/smoke tests cover Wave-1–3 resolve + planner intents.
