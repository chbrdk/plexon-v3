# Capability Catalog — knowledge companion

**Spec SoT:** `specs/domain/capability-catalog.md`  
**Status:** Wave C4 complete — EQC + Agent overlaps on catalog executors behind `CAPABILITY_CATALOG_RUNTIME` (default **off**).  
**Related:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/collection-test-flow-smoke.md` · `specs/domain/eqc-as-collection-flow.md`

## Locked product decisions (C0→C1)

| Question | Decision |
|----------|----------|
| Chat run trigger | `trigger: 'assistant'` (C2) — landed |
| Explore recipes | Playbook / saved prompt in C3 — landed (no new DB entity) |
| Brandion measure | Shared executor; fixture/live via Wave-24 adapter |
| Promote | Always **new** Flow draft; no silent overwrite |

## Wave status

| Slice | Status |
|-------|--------|
| C1.0 / C1.1 Catalog + `checkion.scan` executor | Done |
| C2 Chat list/start Flow | Done |
| C3 Promote → Flow or Playbook recipe | Done |
| C4 EQC + Agent overlaps on catalog ids | Done |

### C4 usage (flag on)

| Surface | Capability path |
|---------|-----------------|
| Flow `domain_scan` / `geo_job` | `executeCheckionDomainScanCapability` / `executeCheckionGeoJobCapability` |
| EQC spine same kinds | Same executors (persona EQC stays rich `runPersonaAndGeoQuestionsStep`) |
| Agent `domain_scan` / `geo_analysis` / `persona_bootstrap` | Same executors |
| `audion.journey_segment` | Agent pointer only — guidance, no second journey runner |

Flag off → legacy clients unchanged.

### C3 usage (Assistant)

1. Nach Scan/GEO: „Als Flow speichern“ → Vorschau  
2. „Flow speichern bestätigen“ → neuer Flow (`assistant-promote-v1`)  
3. Nach Persona×Farbe-Chat: „Als Rezept speichern“ → Chat-Playbook (kein Canvas)

Next: optional Brandion Agent surface / planner allowlist from catalog.

## Why this exists

Assistant tools/workflows and Collection Flow nodes duplicate product jobs (scan, GEO, brand measure, persona bootstrap). EQC already bridges chat → Flow for one playbook. The Capability Catalog generalizes that pattern without turning every canvas node into a chat tool.

## Mental model (one sentence)

**Capabilities** = shared executable contracts; **Agent adapters** and **Flow adapters** are views; **orchestration / explore** stay single-surface.

## Inventory → proposed capability ids

### Shared (Agent + Flow) — pilot Wave C1

| Capability id | Flow kind | Assistant today | Product API / MCP |
|---------------|-----------|-----------------|-------------------|
| `checkion.scan` | `scan` | `quick_scan` / `checkion_scan_single` | CHECKION `POST /api/scans` |
| `checkion.domain_scan` | `domain_scan` | `domain_scan` intent | CHECKION domain scan |
| `checkion.geo_job` | `geo_job` | `geo_analysis` / `checkion_geo_*` | CHECKION GEO jobs |
| `brandion.brand_measure` | `brand_measure` | free-chat Brandion (partial) | Brandion analysis-runs / measure |
| `audion.persona_bootstrap` | `persona_bootstrap` | `persona_bootstrap` / EQC | AUDION bootstrap |
| `plexon.collection_flow.run` | — (meta) | **new** (Wave C2) | `POST …/flows/:id/run` |

### Flow-only (orchestration / authoring)

| Flow kind | Why not Agent tool |
|-----------|--------------------|
| `compare`, `set`, `quality_ok`, legacy `*_gate` | Branch / catalog algebra |
| `human_confirm` | Pause/resume UX owned by Flow/EQC |
| `start`, `prompt`, `observe`, `action`, `gate`, `message`, `success`, `abandon`, `measure` | Journey micro-graph → compiled Audion segment |
| `persona`, `zielgruppe`, `guideline` | Config merge onto segment / measure |
| `journey` (legacy) | Opaque embed |

### Agent-only (explore / UI) — until a Flow need appears

| Surface | Examples | Promote target if user asks “save as flow” |
|---------|----------|---------------------------------------------|
| Brandion tokens/guidelines read | `brandion_tokens_list`, swatch cards | Playbook / saved recipe — **not** Flow |
| Persona cards / knowledge read | `audion_persona_*` read | Playbook unless paired with measure/journey job |
| Generative UI | `plexon_ui_*` | Never a Flow node |
| Checkion scan **read**/summarize | `checkion_scan_get`, summarize | Deep-link / Playbook |

### EQC overlap (Wave C4 align)

| EQC / Flow kind | Capability id (target) |
|-----------------|------------------------|
| `domain_scan` | `checkion.domain_scan` |
| `geo_job` | `checkion.geo_job` |
| `persona_bootstrap` | `audion.persona_bootstrap` |
| `research_brief`, `competitors_suggest`, `suggest_queries` | Keep EQC-typed; catalog later if reused outside EQC |
| `human_confirm` | Flow-only |

## Promote recipes (examples)

### A — Quality chain → Collection Flow

Chat: “Scan URL X, then GEO for persona Y”  
Trace: `checkion.scan` → `checkion.geo_job`  
Promote: linear Flow `start` → `scan` → `geo_job` → `compare`/`quality_ok` (orchestration nodes added by template, not by LLM).

### B — Persona × Brand colors → Playbook (not Flow)

Chat: “How does Persona XY perceive colors in Brandion guideline Z?”  
Trace: Audion persona read + Brandion `tokens_list`  
Promote: **Assistant Playbook** / saved prompt with bound ids.  
Flow only if user upgrades to **measure** (`guideline` + `brand_measure`).

### C — Run existing Flow

Chat: “Run Page Quality on this Collection”  
Capability: `plexon.collection_flow.run`  
No graph authoring.

## Implementation sketch

Canonical module roots:

| Path | Role | Status |
|------|------|--------|
| `lib/capabilities/catalog.ts` | Registry of capability records | C1.0 |
| `lib/capabilities/catalog-normalize-scan.ts` | Agent↔Flow scan catalog equality | C1.0 |
| `lib/capabilities/adapters/*` | tool/intent/kind → id | C1.0 |
| `lib/capabilities/promote.ts` | Trace classify / reject codes | C1.0 |
| `lib/capabilities/runtime-flag.ts` | `CAPABILITY_CATALOG_RUNTIME` | C1.0 |
| `lib/capabilities/executors/checkion-scan.ts` | Shared `checkion.scan` executor | C1.1 |
| `lib/capabilities/executors/checkion-domain-scan.ts` | Shared `checkion.domain_scan` | C4 |
| `lib/capabilities/executors/checkion-geo-job.ts` | Shared `checkion.geo_job` | C4 |
| `lib/capabilities/executors/audion-persona-bootstrap.ts` | Shared `audion.persona_bootstrap` | C4 |
| `lib/capabilities/executors/audion-journey-segment.ts` | Agent pointer (guidance) | C4 |
| `lib/capabilities/executors/plexon-collection-flow-run.ts` | Chat run Flow | C2 |

Env: `CAPABILITY_CATALOG_RUNTIME` — default off; `1`/`true`/`on`/`yes` enables executor wiring.

## Wave checklist (operators)

| Wave | Flag / smoke | Doc update |
|------|--------------|------------|
| C0 | — | this file + domain spec |
| C1 | `CAPABILITY_CATALOG_RUNTIME` | paths.md + orchestrator |
| C2 | chat run Flow smoke | collection-test-flow-smoke companion section |
| C3 | promote reject + happy | this file recipes |
| C4 | EQC/Flow/Agent behind flag; `__tests__/capability-c4-executors.test.ts` | this file + orchestrator Phase 3 |

## Do / Don't

| Do | Don't |
|----|-------|
| Add product power to catalog first | Add a Flow kind and a separate chat handler |
| Keep closed schemas | Free JSON / Code nodes |
| Reject unmappable promote | Guess node graphs from prose |
| Reuse Flow HTTP triggers for chat run | Second run engine for Assistant |
