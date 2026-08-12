# Capability Catalog (Agent ↔ Collection Flow)

**Status:** Wave C4 complete — EQC/Agent overlaps on catalog executors (`CAPABILITY_CATALOG_RUNTIME`, default off); **Wave C5** EQC → Audion persona chat overlay (+ guest budgets)  
**Owner:** PLEXON v3  
**Federation:** `2026-05-plexon-federation-v3`  
**Implements (C1–C3):** `lib/capabilities/*` · `lib/assistant/workflows/run-collection-flow.ts` · handlers `run-collection-flow` / `promote-capability-sequence` · intents `run_collection_flow` / `promote_capability_sequence` · `__tests__/capability-*.test.ts`  
**Companions:**
- Collection Flow: [`collection-test-flow.md`](./collection-test-flow.md)
- EQC bridge: [`eqc-as-collection-flow.md`](./eqc-as-collection-flow.md)
- Assistant flyout: [`central-assistant-flyout.md`](./central-assistant-flyout.md)
- Brandion MCP: [`assistant-brandion-mcp.md`](./assistant-brandion-mcp.md)
- Knowledge: `knowledge/capability-catalog.md` · `knowledge/plexon-assistant-orchestrator.md`

## Purpose

One **Capability Catalog** is the shared contract for product actions that today exist twice:

1. as **Assistant tools** (MCP families + deterministic workflows / playbooks)
2. as **Collection Flow nodes** (closed kinds, ports, run-context catalog)

So that:

- Chat and Flow execute the **same** capability implementation where they overlap.
- Chat can **start** an existing Collection Flow (trigger surface).
- A successful chat recipe can be **promoted** into a Flow (or Playbook) without inventing free graph nodes.
- New product power is added **once** to the catalog, then adapted to Agent and/or Flow.

## Problem (today)

| Layer | What it is | Gap |
|-------|------------|-----|
| Assistant workflows / playbooks | Intent-router + handlers + MCP tool-catalog | Parallel executors to Flow for scans / GEO / Brand / EQC |
| Free-chat MCP | Fine-grained product tools | Not wired to Flow ports / run catalog |
| Collection Flow | Closed node kinds + `runContext` catalog | Chat cannot list/start arbitrary flows; no “promote chat → graph” |
| EQC | Only bridge (`EQC_FLOW_RUNTIME`) | Pattern proven, not generalized |

Two mental models (“assistant workflow” vs “Collection Flow”) confuse users and duplicate adapters.

## Non-goals

- Replacing MCP with Flow nodes 1:1 (MCP stays product tool surface).
- Exposing **every** Flow node kind as an Agent tool (`start`, `prompt`, `gate`, `compare`, …).
- Free JS / generic LLM Code nodes (still dropped — see Collection Flow).
- Merging Audion persona `/chat` into the platform Assistant.
- Rewriting the entire orchestrator in one shot (incremental waves only).
- Canvas cron / trigger **nodes** (still Later in Collection Flow; HTTP triggers already exist).

## Locked decisions

| Decision | Choice |
|----------|--------|
| SoT | **Capability Catalog** in Plexon (`lib/capabilities/`) — not product apps, not `@msqdx/ui` |
| Execution owner | Unchanged: AUDION / CHECKION / BRANDION / ECHON own jobs; Plexon dispatches |
| Agent surface | Catalog entry → **Agent adapter** (tool schema + confirmation + optional UI blocks) |
| Flow surface | Catalog entry → **Flow adapter** (node kind + ports + catalog paths) — only when `surfaces.flow === true` |
| Orchestration-only | Flow kinds without a catalog capability (`compare`, `set`, `human_confirm`, journey micro-steps, terminals) stay **Flow-only** |
| Explore-only | Read/Q&A / generative UI (`plexon_ui_*`, `brandion.tokens_list` explore, persona cards) stay **Agent-only** until a Flow need exists |
| Promote | Chat → Flow only via **validated capability sequences** + templates; never free graph synthesis |
| Naming | Capability ids are stable kebab/dot ids (`checkion.scan`, `brandion.brand_measure`) — independent of MCP underscore names and Flow kind strings |
| Chat run trigger | First-class `trigger: 'assistant'` on `collection_flow_runs` (Wave C2) — **not** reuse `service` (keeps history/analytics distinct; same executor as UI/webhook) |
| Persona talk after EQC | **Audion SoT** — EQC magazine + public share open `ChatOverlay` iframe of Audion `/chat/embed` (guest budgets); fallback deep-link full `/chat`; Platform Assistant may do **short** MCP turns (`audion_chat`) — **never** a second chat stack in Plexon |
| Explore recipes | Wave C3: promote to **Playbook / saved prompt** only — no new DB entity yet. Revisit “Saved Recipe” store after C3 usage |
| Brandion measure | Agent write + Flow share one executor; fixture/live gated by existing Brandion Wave-24 adapter (same flag/path) |
| Promote target | **Always create a new Flow** (draft) on confirm; optional “replace existing” is Later (avoids silent overwrite) |

## Glossary

| Term | Meaning |
|------|---------|
| **Capability** | Closed, typed action with inputs/outputs, side-effect class, and product owner |
| **Agent adapter** | How the Assistant invokes a capability (tool name, confirmation, streaming UX) |
| **Flow adapter** | How Collection Flow invokes the same capability (node kind, ports, catalog writes) |
| **Orchestration node** | Flow control / compare / confirm — **not** a capability |
| **Promote** | Persist a successful capability sequence as Flow template instance or Playbook |
| **Run catalog** | Existing Collection Flow `runContext` field tree (`scan.*`, `persona.*`, …) |
| **CapabilityResult** | Closed result: `{ ok, catalogRoot?, catalogBundle?, error? }` written identically from Agent or Flow |

## Architecture

```
                    ┌─────────────────────────────┐
                    │   Capability Catalog (SoT)  │
                    │  id · owner · io · effects  │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      Agent adapter         Flow adapter        (future) API
   tool + confirm + UI    node kind + ports    service trigger
              │                   │
              ▼                   ▼
      Assistant planner     collection-flow-execute
              │                   │
              └─────────┬─────────┘
                        ▼
              Product MCP / REST (owner)
```

### Capability record (contract)

Every catalog entry MUST declare:

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable, e.g. `checkion.scan` |
| `owner` | yes | `audion` \| `checkion` \| `brandion` \| `echon` \| `plexon` |
| `title` / `description` | yes | Human + planner prose |
| `inputFields` | yes | Closed required/optional field names — no free objects |
| `outputCatalogRoot` | if flow | e.g. `scan`, `geo`, `persona` |
| `sideEffect` | yes | `read` \| `write` \| `job` |
| `confirmation` | yes | `none` \| `destructive` \| `human_gate` |
| `surfaces.agent` | yes | boolean |
| `surfaces.flow` | yes | boolean |
| `agent.toolNames` | if agent | MCP / local tool aliases |
| `agent.intentTypes` | if agent | Deterministic intent-router types |
| `flow.nodeKinds` | if flow | Existing or new closed kinds |
| `executorId` | yes | Module id under `lib/capabilities/executors/` |

MUSS: Agent and Flow adapters for the same `id` call the **same** executor when `CAPABILITY_CATALOG_RUNTIME` is on.  
WENN `surfaces.flow` false, DANN MUSS kein Node-Kind erfunden werden.  
WENN `surfaces.agent` false, DANN MUSS der Planner das Capability nicht als Tool listen.

### Executor interface (Wave C1)

```ts
type CapabilityExecuteContext = {
  platformProjectId?: string | null;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
  brandionGuidelineId?: string | null;
  source: 'agent' | 'flow';
  nodeId?: string; // flow only
};

type CapabilityResult = {
  ok: boolean;
  /** Catalog root key when surfaces.flow (e.g. scan) */
  catalogRoot?: string;
  /** Bundle for setContextBundle — same shape from agent or flow */
  catalogBundle?: Record<string, unknown>;
  /** Opaque product payload for Agent UI builders */
  agentPayload?: unknown;
  error?: string;
};

type CapabilityExecutor = (
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
) => Promise<CapabilityResult>;
```

Rules:

- WENN ein Pilot-Executor läuft, DANN MUSS `catalogBundle` (falls gesetzt) über `build*CatalogBundle` / shared normalizer laufen — nicht hand-gebaut pro Surface.
- SOLANGE `CAPABILITY_CATALOG_RUNTIME` off ist, DÜRFEN Legacy-Pfade unverändert bleiben; Catalog-Module dürfen trotzdem importiert und getestet werden.
- MUSS: Flag via `runtimeEnv('CAPABILITY_CATALOG_RUNTIME')` — default **off** (`1`/`true`/`on` = on).

### Module layout

| Path | Role |
|------|------|
| `lib/capabilities/types.ts` | Record + result types |
| `lib/capabilities/catalog.ts` | Registry of pilot + meta capabilities |
| `lib/capabilities/runtime-flag.ts` | `isCapabilityCatalogRuntimeEnabled` |
| `lib/capabilities/adapters/agent.ts` | tool/intent → capability id |
| `lib/capabilities/adapters/flow.ts` | node kind → capability id |
| `lib/capabilities/catalog-normalize-scan.ts` | Agent `ScanResultPreview` → `scan` catalog bundle |
| `lib/capabilities/promote.ts` | Trace → Flow draft or reject codes (C3; stub reasons in C1) |
| `lib/capabilities/executors/*` | Shared executors (wired C1.1+) |
| `lib/capabilities/index.ts` | Public barrel |

### Surface matrix (rules)

| Kind of thing | Agent | Flow | Example |
|---------------|-------|------|---------|
| Product job / measure | yes (subset) | yes | `checkion.scan`, `brandion.brand_measure` |
| Config merge onto segment | rare | yes | `persona`, `guideline` (authoring) |
| Orchestration / branch | no | yes | `compare`, `human_confirm` |
| Explore / generative UI | yes | no | `plexon_ui_*`, token swatch cards |
| Journey micro-steps | no* | yes (compiled) | `prompt`/`observe`/… → Audion segment |

\*Journey **segment start** may be one capability later (`audion.journey_segment`); individual micro-kinds stay Flow authoring, not Agent tools.

## Pilot set (Wave C1)

Only these capabilities share Agent + Flow in the first implementation wave:

| Capability id | Owner | Flow kind(s) | Agent today | Notes |
|---------------|-------|--------------|-------------|-------|
| `checkion.scan` | checkion | `scan` | `quick_scan` / `checkion_scan_single` | Align poll + `scan.*` catalog |
| `checkion.domain_scan` | checkion | `domain_scan` | domain_scan intent / MCP | Same |
| `checkion.geo_job` | checkion | `geo_job` | geo_analysis / MCP | Catalog `geo.*` |
| `brandion.brand_measure` | brandion | `brand_measure` (+ `guideline` merge) | free-chat Brandion MCP (partial) | Fixture → live evaluate |
| `audion.persona_bootstrap` | audion | `persona_bootstrap` | persona_bootstrap / EQC | Catalog `persona.*` |
| `plexon.collection_flow.run` | plexon | — (meta) | **new** (Wave C2) | Start existing Flow by id; not a canvas node |

**Planned Agent-only (not Flow):** `audion.persona_chat` — maps to Audion chat-api / MCP `audion_chat_*`; SoT UI remains Audion `/chat`. See Wave C5.

Explicitly **out of pilot** as Agent tools: `compare`, `set`, `human_confirm`, Family-A micro-kinds, `research_brief`, Echon waves.

## Chat → run existing Flow

### Intent

`run_collection_flow` (deterministic or planner-routed):

- Inputs: `platformProjectId`, `flowId` **or** `templateId` + latest flow, optional `url` / run payload.
- Behavior: call existing run path with `trigger: 'assistant'` (Wave C2 enum extension).
- UX: stream run status into chat (reuse workflow SSE / ui steps); deep-link to board run history.

### Requirements

- WENN der Nutzer einen Collection Flow starten will und `platformProjectId` + `flowId` bekannt sind, DANN MUSS der Assistent `plexon.collection_flow.run` verwenden — nicht den Graph nachbauen.
- WENN der Flow fehlt oder Binding fehlt, DANN MUSS der Assistent den bestehenden API-Fehler klar melden (keine silent invent).
- SOLANGE ein Run `running` / `awaiting_input` ist, MUSS der Chat Status + Resume-Hinweis anbieten (EQC pattern).

## Chat → promote to Flow

### Intent

`promote_capability_sequence` (after a successful chat turn / workflow):

1. Capture ordered list of **capability ids** + bound inputs from the tool/workflow trace.
2. Map to closed Flow node sequence via Flow adapters (only where `surfaces.flow`).
3. Present preview graph (node titles + params) for confirm.
4. On confirm: `POST …/flows` from nearest template **or** `PATCH` new flow jsonb (validated kinds only) — **new flow only**.
5. Optionally also save as Assistant Playbook when sequence is chat-shaped and has no Flow adapter.

### Promote reject codes (machine-readable)

| Code | When |
|------|------|
| `explore_only` | No step has `surfaces.flow` |
| `unknown_capability` | Trace id not in catalog |
| `unbound_required_input` | Required input missing after confirm |
| `empty_trace` | No steps |

### Mapping rules

| Trace | Promote target |
|-------|----------------|
| All steps have `surfaces.flow` | Collection Flow draft (new) |
| Mix of explore + jobs | Flow = jobs only; explore stays chat recipe / Playbook note |
| Only explore (e.g. tokens Q&A) | Playbook / saved prompt — **not** a Flow |
| Unknown / open params | Reject with reason — do not guess |

### Persona × Brand example

Recipe (Agent-only explore today):

1. Resolve persona (Audion MCP) — explore / card  
2. Resolve guideline + color tokens (Brandion MCP) — explore / swatches  

Promote candidates:

| Path | When |
|------|------|
| **Playbook** | Repeatable Q&A in chat (“how does Persona X see brand colors”) |
| **Flow** | When user wants scheduled/webhook **measure** — map to `guideline` + `brand_measure` (+ optional persona config), not to token list tools |

MUSS: Promote never creates a node for `brandion.tokens_list` until that capability gains `surfaces.flow`.

## Waves

### Wave C0 — Spec + inventory

- [x] Domain spec + knowledge companion  
- [x] Inventory table in knowledge  
- [x] Cross-links in specs-index + paths  

**Exit:** Team agrees pilot set + non-goals. **Done.**

### Wave C1 — Catalog skeleton + shared catalog shape (current)

**C1.0 (landed):**

- [x] `lib/capabilities/` types, catalog registry, adapters, runtime flag (default off)
- [x] `catalog-normalize-scan` — Agent scan preview → Flow `scan.*` bundle via `buildScanCatalogBundle`
- [x] `promote.ts` reject/classify helpers (no UI yet)
- [x] Contract tests in `__tests__/capability-catalog.test.ts`

**C1.1 (landed):**

- [x] `executors/checkion-scan.ts` — Agent→`runCheckionQuickScan`, Flow→`runCheckionSingleScan`, shared catalog root
- [x] Flow page-`scan` path uses executor when `CAPABILITY_CATALOG_RUNTIME` on
- [x] `runQuickScanWorkflow` uses executor when flag on
- [x] Tests: `__tests__/capability-checkion-scan-executor.test.ts`, `__tests__/capability-quick-scan-flag.test.ts`
- [x] Env in Coolify docs

**Exit:** `checkion.scan` identical `catalogBundle` contract + both surfaces call the same executor module when flag on. **Done.**

### Wave C2 — Chat run Collection Flow

- [x] Extend `CollectionFlowRunTrigger` with `'assistant'`
- [x] Session-owned helper (`ui` \| `assistant`) for resume/abort routes
- [x] Capability `plexon.collection_flow.run` + `runCollectionFlowFromAssistant` (sync like UI Testen)
- [x] Intent `run_collection_flow` + handler (list picker chips / run + board deep-link)
- [x] Tests: `__tests__/capability-run-collection-flow.test.ts`

**Exit:** User can start a gallery Flow from Assistant and see completion / deep link. **Done.**

### Wave C3 — Promote sequence (narrow)

- [x] Trace from conversation history (`workflowType` → capability ids) + explore heuristics
- [x] `buildPromotedFlowDocument` / `buildPlaybookRecipe` / `persistPromotedFlow` (always **new** flow, template `assistant-promote-v1`)
- [x] Intent `promote_capability_sequence` — preview then confirm; explore-only → Chat-Rezept
- [x] Tests: `__tests__/capability-promote.test.ts` (scan→geo flow; explore playbook; reject missing url)

**Exit:** Persona×Brand → Playbook path; scan chain → Flow path. **Done.**

### Wave C4 — Expand catalog + EQC alignment

- [x] Fold EQC typed actions that overlap (`persona_bootstrap` catalog share, `geo_job`, `domain_scan`) onto catalog ids (EQC template stays; persona EQC keeps rich persona+GEO step).
- [x] Optional: `audion.journey_segment` as Agent capability pointer (micro-nodes stay Flow-authored).
- [x] Deprecate duplicate handler code paths behind `CAPABILITY_CATALOG_RUNTIME` (Flow + EQC + Agent domain/geo/persona).
- [x] Update `knowledge/plexon-assistant-orchestrator.md` Phase 3.

**Exit:** No second executor for pilot ids when flag on; EQC still green on Flow runtime when flag off. **Done.**

### Wave C5 — Persona talk after EQC (overlay + budgets)

**Decision (2026-08-11):** Do **not** rebuild Audion chat in Plexon and do **not** merge Audion `/chat` into the Central Assistant. Host Audion via iframe + `ChatOverlay`; enforce guest budgets on public/embed stream.

| Surface | Behavior |
|---------|----------|
| EQC magazine + public share | CTA **„Mit Persona sprechen“** → `EqcPersonaChatOverlay` iframe `resolveEqcPersonaChatEmbedHref` → Audion `/chat/embed?…` |
| Fallback | **„In Audion öffnen“** → `resolveEqcPersonaChatHref` → full `/chat?personaId=&projectId=` |
| Guest budget | 5 turns / ~800 chars / 30 min TTL — Audion `guest-budget.ts` + stream gate |
| Central Assistant | Orchestration + optional **short** `audion_chat` MCP turns; long sessions → same handoff (**chip optional**) |
| Capability | Register `audion.persona_chat` as **Agent-only** (`surfaces.flow: false`) — **optional stub** |

**Exit:** Public share + logged-in magazine open overlay chat without a second stack; budget hard-stop works; deep-link fallback remains. Spec companions: `eqc-as-collection-flow.md` · `ui-migrate-event-quick-check.md` · `knowledge/eqc-persona-chat.md` · Audion `chat-embed.md`.

## Relation to existing systems

| System | Stays | Changes |
|--------|-------|---------|
| MCP servers | Product SoT for tool schemas | Plexon Agent adapter maps MCP names → capability ids |
| `tool-catalog.ts` families | Planner filter | Prefer capability `surfaces.agent` allowlist over time |
| Intent-router / playbooks | Fast paths | Handlers call catalog executors |
| Collection Flow kinds | Closed set | New kinds only when catalog adds `surfaces.flow` |
| EQC-as-flow | Canonical EQC | Gradually share executors with catalog |
| Generative UI | Agent-only | Unchanged |
| `collection_flow_runs.trigger` | `ui` \| `webhook` \| `service` \| `assistant` | C2 landed |

## Testing requirements (every wave)

| Layer | What |
|-------|------|
| Unit | Capability schema validate; adapter mapping; promote reject reasons |
| Contract | Agent vs Flow catalog bundle equality (`checkion.scan` first) |
| UI smoke | Chat run Flow; promote preview confirm (C2/C3) |
| Build | Existing Collection Flow + assistant test suites still pass |

## Acceptance

- WENN Product und Engineering die Pilot-Tabelle und Non-goals lesen, DANN MÜSSEN sie entscheiden können, was Agent-Tool vs Flow-Node vs beides ist.
- SOLANGE Wave C1.1 nicht grün / Flag off ist, DARF kein generisches “alle Nodes als Tools” im Planner landen.
- WENN `CAPABILITY_CATALOG_RUNTIME` off, DANN MUSS Legacy-Verhalten unverändert bleiben.
