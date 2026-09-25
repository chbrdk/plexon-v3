# Assistant domain specialists (internal)

**Status:** Accepted — Wave 5 2026-09-25 (registry complete + activity polish)  
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

### Wave 4

| Id | Label | Canonical families (planner SoT) |
|----|-------|----------------------------------|
| `audion_knowledge` | Audion Knowledge | `AUDION_KNOWLEDGE_FAMILIES` |
| `audion_journey` | Audion Journey | `AUDION_JOURNEY_FAMILIES` |
| `audion_chat` | Audion Chat | `AUDION_CHAT_FAMILIES` |
| `audion_documents` | Audion Documents | `AUDION_DOCUMENTS_FAMILIES` |
| `checkion_journey` | Checkion Journey | `CHECKION_JOURNEY_FAMILIES` |

All other intents (`general_chat`, `project_knowledge`, `action_write`) resolve **no** specialist — agent stacks product connectivity blocks (built **after** the plan, using plan-narrowed MCP flags). Cross-product / embedded-context turns stay on the orchestrator without a domain specialist.

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
  | 'audion_knowledge'
  | 'audion_journey'
  | 'audion_chat'
  | 'audion_documents'
  | 'checkion_journey'

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
- Planner metadata / SSE `plan` events include `specialistId` + `specialistLabel`; `PlannerStepCard` surfaces the label in the activity trace (intent labels are i18n’d for all registered specialists).
- `resolveSpecialistToolRoundBudget(planRounds, specialist)` applies specialist `maxToolRounds` as a **floor** (planner remains SoT for the base plan).
- `echon_audience` enables Audion + Echon (+ Checkion when entitled) MCP flags so audience-write tools load.

## Wave 5 (polish)

- Intent i18n coverage for all registered specialist intents.
- Activity / planner summary avoids redundant specialist+intent wording.
- Tool-round floor from specialist profile.
- Registry program closed for product intents; remaining non-specialist intents stay orchestrator-only.

## Flow handoff (long jobs)

Durable / multi-step work MUST prefer **Collection Flow** over endless free-chat tool rounds:

| Surface | Mechanism |
|---------|-----------|
| Follow-ups | After specialist turns with a bound Collection: chips **Flow starten** / **Flows zeigen** / **Als Flow speichern** (`lib/assistant/insights/specialist-flow-handoff.ts`) |
| Auto-resolve | „Flow starten“ without id/name: sole Collection Flow **or** unique name/template match for the last specialist (`resolvePreferredFlowForSpecialist`) |
| System hint | When the user prompt looks like a long job (deep scan, research run, batch, …) and the specialist is in the handoff set, inject a Flow-Handoff block into the system prompt |
| Intent router | `run_collection_flow` / `promote_capability_sequence` (Capability Catalog C2/C3) |

Handoff specialist set: `checkion_scan`, `checkion_seo_geo`, `checkion_journey`, `echon_market`, `echon_audience`, `videon_media`, `audion_ux_journey`, `metron_analytics`.

Non-goals unchanged: no second chat, no parallel LLM subagents, no free graph synthesis.

## Non-goals

- Visible multi-agent UI or parallel LLM subagent rounds
- Merging Audion persona chat into the Platform Assistant
- Changing Capability Catalog or Collection Flow

## Done when

1. Spec + orchestrator knowledge document Wave 1–5 + Flow handoff.
2. `lib/assistant/specialists/*` registry ships all seventeen profiles.
3. `runAssistantAgent` resolves and awaits specialist addenda; planner meta exposes specialist id/label.
4. Activity UI shows specialist label + i18n intent labels on the planner card.
5. Unit/smoke tests cover Wave-1–5 resolve, budget floor, planner intents, and Flow handoff follow-ups/hints.
6. Long-job specialist turns surface Collection Flow chips and optional system handoff hint.
