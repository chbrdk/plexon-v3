# Collection Test Flow

**Status:** Wave 1 quality path implemented (2026-08-05) — journey embed Wave 2  
**Owner:** PLEXON v3 (orchestration SoT)  
**Federation:** `2026-05-plexon-federation-v3`  
**Companions:**
- Collection model: `specs/domain/collection-projects.md`
- AUDION journey graph: `audion-v3/specs/domain/ux-test-flow-model.md` (Phases 1–8)
- AUDION ↔ CHECKION page handoff: `audion-v3/specs/domain/checkion-single-scan-trigger.md` · `checkion-v3/specs/domain/audion-journey-scan-trigger.md`
- Shared chrome: `msqdx-ui/specs/domain/floating-panel.md`
- Evidence (AUDION): Phase 7 Completion & evidence in `ux-test-flow-model.md`

**Not this:** Legacy Prismion `/board` island (`specs/domain/ui-migrate-board.md`) — separate surface; Collection Test Flow does **not** extend that MUI/bridge canvas.

## Purpose

One **Collection-scoped** test program that composes:

1. **AUDION** persona / journey execution (live agent, gates, study evidence)
2. **CHECKION** page quality signals (single-page scan, score, issues)
3. **PLEXON** graph + unified verdict (“task done **and** page evidence enough”)

Users see **one Projekt**. Capabilities stay product-local; Plexon owns the cross-product flow SoT, dispatch, and Collection-level evidence rollup.

## Non-goals (MVP)

- Second product-only project model
- Porting Audion Board 1:1 into Plexon as a skin
- Domain-crawl / GEO / Brandion nodes in Wave 0–1
- Collaborative multi-user live editing
- Replacing React Flow or inventing a second DS graph primitive

## Ownership

| Concern | Owner |
|---------|--------|
| Graph SoT (nodes/edges, notes, Collection binding) | **PLEXON** |
| Unified run cursor + Collection verdict | **PLEXON** |
| Journey agent jobs, persona, think-aloud, study wave fields | **AUDION** |
| Single-page scan, score, issues dossier | **CHECKION** |
| FloatingPanel / Button / Input magazine chrome | **`@msqdx/ui`** |
| Domain RF node chrome for journey kinds | AUDION patterns (compose under Plexon CSS tokens) |
| Domain RF node chrome for quality kinds | CHECKION patterns (compose under Plexon CSS tokens) |

Deep links always carry `platformProjectId` when available (`collection-projects.md` invariant 4).

## Glossary

| Term | Meaning |
|------|---------|
| **Collection Test Flow** | Saved graph keyed by `platformProjectId` (+ optional template id) |
| **Capability node** | Node whose runtime is owned by AUDION or CHECKION |
| **Orchestration node** | Gate / parallel / handoff / terminal owned by Plexon evaluator |
| **Segment run** | One product job spawned for a contiguous capability segment |
| **Collection verdict** | Rollup of flow completion + task + page quality + evidence |

## Node families

### A — Journey (AUDION capability)

Reuse closed set from Audion `UxTestFlow` (do not redefine semantics):

| Kind | Role |
|------|------|
| `start` | URL / urlKey, optional persona, device |
| `prompt` / `observe` / `action` / `message` | Journey steps |
| `measure` | Soft-Q / SEQ |
| `success` / `abandon` | Journey terminals (may still trail `measure`) |

Gates that depend only on journey signals stay in family A (`url_match`, `goal_reached`, `frustration_high`, … — Audion closed set).

### B — Page / Quality (CHECKION capability)

| Kind | Role |
|------|------|
| `page` | Explicit page URL (defaults to active cursor URL from prior journey step) |
| `scan` | Trigger CHECKION `mode: single` on bound project |
| `issue_gate` | Branch on issue severity / count / rule family |
| `score_gate` | Branch on score band / threshold |
| `quality_ok` | Positive quality terminal (optional; may map to journey `success`) |

### C — Orchestration (PLEXON)

| Kind | Role |
|------|------|
| `gate` | Generic branch; `gateCondition` names closed-set id (journey **or** quality) |
| `hand_off` | Explicit capability switch (AUDION ↔ CHECKION) with correlation ids |
| `parallel` | Sibling segments (contrast / multi-persona / multi-page) |
| `retest` | Re-run prior capability segment after change note |

MVP may fold `hand_off` into sequential edges (implicit handoff when leaving a capability segment) and keep `hand_off` as optional explicit node.

## Edge kinds

Same as Audion V1: `then` | `when` | `otherwise` | `parallel`.

## Gate conditions (extended closed set)

### Journey (existing — AUDION emits)

`frustration_high`, `url_match`, `title_match`, `consent_accepted`, `consent_rejected`, `goal_reached`, `confusion_named`, `time_elapsed`.

### Quality (new — CHECKION emits / Plexon evaluates)

| Id | Meaning | Signal source |
|----|---------|---------------|
| `scan_complete` | Single-page scan finished successfully | CHECKION job status |
| `score_at_least` | Aggregate / lens score ≥ `threshold` | Scan score payload + node `threshold` |
| `score_below` | Score &lt; `threshold` | Same |
| `critical_issues` | Count of critical (or worse) issues ≥ `minCount` | Issues summary |
| `no_critical_issues` | Zero critical issues | Issues summary |
| `issue_rule_match` | At least one issue matching `pattern` (rule id / family) | Issues list |

Node fields for quality gates: `threshold?: number`, `minCount?: number`, `pattern?: string`, `lensId?: string` (optional future).

Do **not** invent open-ended expression languages in MVP.

## Graph rules

1. Exactly one `start` (journey family) **or** one `page` as entry — MVP prefers `start` with URL, optional immediate `scan` via `then`.
2. Capability segments are contiguous runs of family A **or** family B between orchestration nodes.
3. `gate` / `issue_gate` / `score_gate` require `when` + `otherwise`.
4. Terminals: journey `success`|`abandon` and/or `quality_ok`; Collection flow is complete when the **active path** reaches any terminal and required quality gates on that path are evaluated.
5. No cycles in MVP templates.
6. Every capability node carries optional `note` (persisted on Collection flow jsonb).

## Runtime model

```text
Plexon Collection Flow runner
  ├── resolve bindings (audion + checkion must be in_sync for full run)
  ├── walk active path
  ├── journey segment → AUDION journey agent (flow_graph subset + persona)
  ├── quality segment → CHECKION POST /api/scans mode=single (+ poll)
  ├── evaluate gates on merged signal bus
  └── emit CollectionFlowCursor + CollectionVerdict
```

### Signal bus (Collection)

Plexon merges:

| Bundle | Origin |
|--------|--------|
| `journeySignals` | Audion `gateSignals` + scorecard coverage + flowCursor |
| `qualitySignals` | Checkion scan status, scores, issue counts, finalUrl |
| `correlation` | `platformProjectId`, `audionJobId` / wave run id, `checkionScanId`, `stepUrl` |

Reuse existing handoff fields from `checkion-single-scan-trigger.md` (`platformProjectId`, `audionRunId`, `stepUrl`).

### Dispatch rules (MVP)

1. **Journey segment:** compile contiguous A-nodes to Audion `flow_graph` (or lean task + graph) via existing Study-from-flow / agent start APIs. Prefer binding `external_project_id` for Audion project.
2. **Scan node:** `POST {CHECKION}/api/scans` with `mode: single`, `projectId` = Checkion binding, `url` = page URL from `page` node or last journey `finalUrl` / start URL, plus correlation.
3. **Quality gate:** evaluate only after scan terminal state; do not block journey mid-step unless the graph places the gate there.
4. Failures: binding missing / sync failed → Collection run `error` with capability chip; do not invent a product-only project.

## Evidence & Collection verdict

Align with Audion Phase 7, extend for quality:

| Flag | Meaning |
|------|---------|
| `flowCompleted` | Active path reached a terminal |
| `taskCompleted` | Journey success / goal signals (Audion `deriveFlowVerdict` / wave fields) |
| `pageEvidenceValid` | Scan completed, not junk/cancelled; issues payload present when gate required it |
| `qualityPassed` | All quality gates on active path matched their **taken** branch intent (e.g. `when` = pass path) |
| `validEvidence` | Journey validEvidence **and** (if quality nodes on path) `pageEvidenceValid` |
| `collectionReady` | `taskCompleted` ∧ `validEvidence` ∧ (`qualityPassed` if quality gates exist on path) |

Caveats: infra blockers (403, empty scan) set `pageEvidenceValid=false` with reason — same spirit as Audion `inferValidEvidence` junk rules.

**Wave 1:** Persist `lastVerdict` + `lastRun` metadata on the flow **jsonb** (no `collection_flow_runs` table yet). Score signal = CHECKION contracts `overallScore`.

## Persistence (sketch)

| Store | Notes |
|-------|-------|
| `collection_test_flows` (Plexon) | `id`, `platform_project_id`, `name`, `flow` jsonb, `owner_id`, `template_id`, timestamps |
| Optional link | `audion_saved_flow_id` / template reference for imported journey subgraphs |
| Runs (Wave 2+) | `collection_flow_runs` — cursor, correlation ids, verdict jsonb |

Wave 1 ships the Drizzle table + migration `0005_collection_test_flows.sql`.

## UI (Plexon)

| Surface | Role |
|---------|------|
| `/projects/[platformProjectId]/flows` | Gallery + create from template |
| `/projects/[platformProjectId]/flows/[flowId]` | Immersive **Board** (workspace magazine) |
| Chrome | `@msqdx/ui` `FloatingPanel`, square `Button`/`Chip`, magazine tokens — same Phase 8 rules as Audion board |
| Deep links | “Open in AUDION wave” / “Open CHECKION scan result” with Collection context |

Do not place this on legacy `/board` Prismion island.

## Keep / reshape / drop

| | |
|--|--|
| **Keep** | Audion journey node semantics + Live-Gates; Checkion single-scan API; Collection bindings; DS FloatingPanel |
| **Reshape** | Audion Board → capability workspace; Plexon composes multi-capability graph + Collection verdict |
| **Drop** | Copy-paste Audion glass board into Plexon; product-only “Audion flow project”; open expression gates; dumping Checkion report magazine onto Overview |

## Phasing

| Wave | Deliverable | Exit criteria |
|------|-------------|---------------|
| **0 — Spec** (this doc) | Domain contract + node/gate sets + ownership | Merged; linked from `collection-projects.md` + `paths.md` |
| **1 — MVP quality path** | Persist Collection flow; Board UI shell; quality path only: `start` → `scan` → `score_gate` → `quality_ok` / `abandon`; CHECKION `POST /api/scans` `mode=single` + poll `overallScore`; Collection verdict on flow jsonb | Staging smoke: `/projects/{id}/flows` + run against Collection with Checkion binding; `collectionReady` explained |
| **2 — Journey embed** | Import / embed Audion `UxTestFlow` subgraph; handoff URL → auto `scan`; correlation ids end-to-end | Same URL tracked in Audion steps + Checkion scan |
| **3 — Issue gates + dossier link** | `issue_gate` / `critical_issues`; deep link to Issues report surface | Gate branch visible on Board |
| **4 — Study rollup** | Push Collection verdict into Audion wave evaluate / Soft-Q notes; optional Knowledge Pack distillate | Evaluate shows cross-product evidence rates |
| **Later** | Parallel multi-page, GEO nodes, Brandion, multi-user live | Out of MVP |

## Acceptance (Wave 0)

1. Spec lives at `plexon-v3/specs/domain/collection-test-flow.md`.
2. Linked from Collection projects + paths index.
3. Explicit: orchestration in Plexon; execution in capabilities; no second project model.
4. MVP Wave 1 scope is small enough to implement without redesigning Audion agent or Checkion scan core.

## Wave 1 implementation notes

- **Quality path only** — Audion journey agent embed waits for Wave 2.
- Canonical score: CHECKION `ScanSummary.overallScore` (0–100); gate `score_at_least` default threshold **70**.
- Routes: `/projects/[platformProjectId]/flows` · `/projects/[platformProjectId]/flows/[flowId]` · BFF under `/api/platform/projects/:id/flows…`.
- Auth: same session/ACL as Collection Knowledge Pack APIs.

## Open questions (non-blocking)

- Whether Wave 2 journey segment calls Audion agent **directly** from Plexon BFF vs creating an Audion Study/Wave row first (prefer Wave row for evidence parity with Phase 7).
- Lens-specific scores beyond `overallScore` (issue gates / dossier) — Wave 3.
