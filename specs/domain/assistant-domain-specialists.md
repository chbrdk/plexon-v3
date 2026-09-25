# Assistant domain specialists (internal)

**Status:** Accepted — Wave 1 2026-09-25  
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

## Wave 1 specialist IDs

Specialist id **equals** `AssistantPlan.intent` for these intents:

| Id | Label | Canonical families (planner SoT) |
|----|-------|----------------------------------|
| `metron_analytics` | Metron | `METRON_ANALYTICS_FAMILIES` (+ write when gated) |
| `checkion_scan` | Checkion Scan | `SCAN_FAMILIES` |
| `creation_scene_edit` | Creation Scene | `CREATION_SCENE_EDIT_*` (+ Spirion when gated) |

All other intents (`general_chat`, `brandion_brand`, …) resolve **no** specialist — agent keeps stacking product connectivity blocks as today.

## Contract

```ts
type AssistantSpecialistId =
  | 'metron_analytics'
  | 'checkion_scan'
  | 'creation_scene_edit'

type AssistantSpecialist = {
  id: AssistantSpecialistId
  label: string
  /** Documented families; planner remains SoT for the live plan. */
  toolFamilies: ToolFamily[]
  buildSystemAddendum(ctx: SpecialistContext): string
  maxToolRounds?: number
}
```

- `resolveSpecialist(intent)` → specialist or `null`.
- When a specialist is active, the agent injects **only** that specialist’s addendum (plus base system prompt / retrieval / plan block) — not the full product connectivity stack.
- Planner metadata / SSE `plan` events MAY include `specialistId` + `specialistLabel` for the activity trace.

## Non-goals (Wave 1)

- Visible multi-agent UI or parallel LLM subagent rounds
- Merging Audion persona chat into the Platform Assistant
- Rewriting every intent into the registry in one shot
- Changing Capability Catalog or Collection Flow

## Done when

1. Spec + orchestrator knowledge document Wave 1.
2. `lib/assistant/specialists/*` registry ships the three profiles.
3. `runAssistantAgent` resolves and injects specialist addenda; planner meta exposes specialist id/label.
4. Unit/smoke tests cover resolve + Metron/Checkion/Creation intents.
