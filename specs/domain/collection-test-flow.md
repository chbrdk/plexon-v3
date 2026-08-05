# Collection Test Flow

**Status:** Wave 4 Study rollup implemented (2026-08-05)  
**Owner:** PLEXON v3 (orchestration SoT)  
**Federation:** `2026-05-plexon-federation-v3`  
**Companions:**
- Collection model: `specs/domain/collection-projects.md`
- AUDION journey graph: `audion-v3/specs/domain/ux-test-flow-model.md` (Phases 1–8)
- AUDION ↔ CHECKION page handoff: `audion-v3/specs/domain/checkion-single-scan-trigger.md` · `checkion-v3/specs/domain/audion-journey-scan-trigger.md`
- Shared chrome: `msqdx-ui/specs/domain/floating-panel.md` · `msqdx-ui/specs/domain/flow-board-chrome.md`
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
| Chrome | `@msqdx/ui` flow board chrome (`FlowBoardStage`, `FlowNodeCard`, …) + `FloatingPanel`; rounded float shells (12px) + pill Bausteine FAB — SoT in `flow-board-chrome.md` |
| Deep links | “Open in AUDION wave” / “Open CHECKION scan result” with Collection context |

Do not place this on legacy `/board` Prismion island.

## Keep / reshape / drop

| | |
|--|--|
| **Keep** | Audion journey node semantics + Live-Gates; Checkion single-scan API; Collection bindings; DS FloatingPanel |
| **Reshape** | Audion Board → Collection capability workspace: **same board chrome + authoring UX** as Audion Phase 5–8, plus Checkion/orchestration nodes and Collection verdict on one canvas |
| **Drop** | Glass/MUI/Prismion `/board` island; product-only “Audion flow project”; open expression gates; dumping Checkion report magazine onto Overview |
| **Parity (Waves 5–7)** | Board authoring, palette, Save/Undo, Testen/Stop, live node states, path highlight, Inspector, Live-Gate branch, Agent-Segment patterns — Soft-Q edit / Compare stay on Audion Wave (deep link + Wave-4 rollup) |

## Phasing

| Wave | Deliverable | Exit criteria |
|------|-------------|---------------|
| **0 — Spec** (this doc) | Domain contract + node/gate sets + ownership | Merged; linked from `collection-projects.md` + `paths.md` |
| **1 — MVP quality path** | Persist Collection flow; Board UI shell; quality path only: `start` → `scan` → `score_gate` → `quality_ok` / `abandon`; CHECKION `POST /api/scans` `mode=single` + poll `overallScore`; Collection verdict on flow jsonb | Staging smoke: `/projects/{id}/flows` + run against Collection with Checkion binding; `collectionReady` explained |
| **2 — Journey embed** | Template `journey-quality`: Collection `journey` node + embedded Audion `journeyFlow`; Study/Wave `from-flow` → start → poll; handoff `finalUrl` → CHECKION scan with `platformProjectId` / `audionRunId` / `stepUrl`; verdict adds `taskCompleted` / `validEvidence` | Staging smoke: same URL in Audion job + Checkion scan correlation |
| **3 — Issue gates + dossier link** | Template `page-quality-issues` (+ journey variant): `issue_gate` with `critical_issues` / `no_critical_issues`; fetch `GET /api/scans/:id/issues`; branch on Board; deep link `/results/:id/issues` | Staging: gate branch visible; dossier link opens CHECKION Issues |
| **4 — Study rollup** | After journey run: Audion `evaluate` + PATCH wave (`reportMarkdown` / Soft-Q `notes` + cross-product rates); optional Knowledge Pack `research_brief` distillate | Evaluate/Study shows Collection verdict notes; KP section when distillate ok |
| **5 — Board chrome + authoring** | Immersive Audion-parity docks (toolbar / Bausteine / run strip / inspector); edit drag/connect/palette/undo/Save; Audion + Checkion node kinds on one RF canvas | Side-by-side with Audion board feels same family; can author journey+quality without leaving Plexon |
| **6 — Live run on canvas** | Client-orchestrated journey poll paints node states / path / Inspector; then quality segment on same board; Stop/cancel | Running Collection flow feels like Audion Testen + quality gates |
| **7 — Polish** | Output→Note, Reset-to-template, Evaluate deep-link / Soft-Q read-only summary; smoke + tests | edit→save→run→verdict contract green |
| **Later** | Parallel multi-page, GEO nodes, Brandion, multi-user live | Out of MVP |

## Acceptance (Wave 0)

1. Spec lives at `plexon-v3/specs/domain/collection-test-flow.md`.
2. Linked from Collection projects + paths index.
3. Explicit: orchestration in Plexon; execution in capabilities; no second project model.
4. MVP Wave 1 scope is small enough to implement without redesigning Audion agent or Checkion scan core.

## Wave 1 implementation notes

- **Quality path only** — template `page-quality`; Audion journey agent embed is Wave 2.
- Canonical score: CHECKION `ScanSummary.overallScore` (0–100); gate `score_at_least` default threshold **70**.
- Routes: `/projects/[platformProjectId]/flows` · `/projects/[platformProjectId]/flows/[flowId]` · BFF under `/api/platform/projects/:id/flows…`.
- Auth: same session/ACL as Collection Knowledge Pack APIs.

## Wave 2 implementation notes

- Template **`journey-quality`**: board `start` → `journey` → `scan` → `score_gate` → terminals; jsonb embeds Audion-shaped `journeyFlow` (minimal `start`→`action`→`success`).
- Journey via Audion **Study/Wave** (`POST /api/studies/from-flow` → wave start → poll `/api/ux-journey-agent/run/{jobId}` → optional sync). Bearer `AUDION_API_TOKEN` against platform API base — not `X-Service-Secret`.
- Scan URL = journey `finalUrl` (else start/scan node URL). Correlation on CHECKION POST: `platformProjectId`, `audionRunId` (= jobId), `stepUrl`.
- `collectionReady` with journey = `taskCompleted` ∧ `validEvidence` ∧ `qualityPassed`; quality-only still treats task as satisfied.

## Wave 3 implementation notes

- Node `issue_gate` after `score_gate` on templates `page-quality-issues` / `journey-quality-issues`.
- Default condition `critical_issues` with `minCount: 1` — quality pass when critical count &lt; minCount; `no_critical_issues` when count === 0.
- Issues via `GET {CHECKION}/api/scans/:id/issues` (`checkionApiScanIssues`); severity `critical` only (contracts `IssueSeverity`).
- `qualityPassed` = score gate ∧ issue gate (when present). Dossier UI: `pathCheckionScanIssues(scanId)` → `/results/{id}/issues`.
- `lastRun` / verdict expose `criticalCount`, `issueCount`, `issueGateBranch` (`pass`|`fail`).

## Wave 4 implementation notes

- After a completed run **with** Audion `studyId`/`waveId`: `POST …/evaluate` then `PATCH` wave with Collection `reportMarkdown` + Soft-Q `notes` (preserve prior evaluate notes) and cross-product rate lines (`taskCompleted`, `pageEvidenceValid`, `qualityPassed`, `collectionReady`).
- Soft-Q **scores** stay Audion Evaluate output — Plexon does not invent Soft-Q values from Checkion.
- Optional distillate: merge section `collection-test-flow-latest` into Knowledge Pack `research_brief` (product `plexon`). Best-effort; run success does not depend on KP/wave PATCH.
- `lastRun` flags: `waveEvaluateOk`, `waveRollupOk`, `knowledgeDistillateOk`.

## Wave 5–7 implementation notes

- Graph SoT stays `collection_test_flows`. Node kinds = Audion closed set (`prompt`/`observe`/`action`/`gate`/`message`/`measure`/`success`/…) **plus** quality (`scan`/`score_gate`/`issue_gate`/`quality_ok`) and legacy opaque `journey`.
- Edges use Audion kinds `then`|`when`|`otherwise`|`parallel` (stored as `edgeKind`; score/issue gates also use `when: pass|fail`).
- Board chrome SoT: `@msqdx/ui` `.msqdx-flow-*` (`flow-board-chrome.md`) — not a Plexon-only CSS fork.
- Save via `PATCH …/flows/:flowId` with full `flow` document; Undo is session-local.
- Wave 6: `POST …/run/journey` → poll `GET …/journey-jobs/:jobId` → `POST …/run` with journey handoff for Checkion + verdict.
- Soft-Q edit remains Audion Wave; board offers Evaluate deep link + read-only Soft-Q summary when wave ids present.

## Open questions (non-blocking)

- Richer Soft-Q mapping from Checkion lenses — later if product asks.
