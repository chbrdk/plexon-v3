# Collection Test Flow

**Status:** Wave 21 n8n fullscreen node editor (INPUT | Parameters | OUTPUT)  

**Owner:** PLEXON v3 (orchestration SoT)  
**Federation:** `2026-05-plexon-federation-v3`  
**Companions:**
- Collection model: `specs/domain/collection-projects.md`
- Capability Catalog (Agent ↔ Flow, planned): `specs/domain/capability-catalog.md` · `knowledge/capability-catalog.md`
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
- Collaborative multi-user live editing
- Replacing React Flow or inventing a second DS graph primitive
- Dumping every Checkion UI surface as a node (Overview / Share / Settings stay deep-links)

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

Reuse closed set from Audion `UxTestFlow` (do not redefine semantics), plus Collection **config** kinds that merge into `start` on extract:

| Kind | Role |
|------|------|
| `zielgruppe` | **Config (Wave 11)** — pick Collection target group → `segment` / names on extract |
| `persona` | **Config (Wave 11)** — pick Collection Audion persona → `personaId` / `personaName` on extract |
| `start` | URL / urlKey, optional persona fields (also filled from config nodes) |
| `prompt` / `observe` / `action` / `message` | Journey steps (palette may use **presets** for `action` / Frage) |
| `measure` | Soft-Q / SEQ — `measureKey` + question `text` (Wave 11) |
| `success` / `abandon` | Journey terminals; `success` writes `journey.*` catalog outputs |

Gates that depend only on journey signals stay in family A (`url_match`, `goal_reached`, `frustration_high`, … — Audion closed set).

**Extract rule:** `persona` / `zielgruppe` are authoring-only — omitted from the Audion agent graph; their fields merge onto the journey `start` before `from-flow`.

### B — Page / Quality (CHECKION capability)

Orchestration nodes only — start job → poll → signal → branch. Report chrome stays in CHECKION via deep links.

| Kind | Role | Wave |
|------|------|------|
| `page` | Explicit page URL (optional; defaults to journey/start URL) | later |
| `scan` | CHECKION page scan — `scanMode: single \| deep` (default `single`); writes `scan.*` catalog output | **8A** / **9** |
| `domain_scan` | CHECKION domain crawl — writes `domain.*` | **8A** / **9** |
| `geo_job` | CHECKION GEO job — writes `geo.*` | **8B** / **9** |
| `compare` | Branch on catalog path / open expression + closed op (`gte`/`lte`/…) | **9** / **18** |
| `set` | Alias: resolve source expression → `outputs[alias]` before compares | **20** |
| `quality_ok` | Positive quality terminal | 1 |
| `score_gate` / `issue_gate` / `geo_gate` | **Legacy** — migrated to `compare` on load (Wave 9) | 1–8B |

#### Keep / reshape / drop (quality catalog)

| Decision | Item |
|----------|------|
| **Keep** | `scan` / `domain_scan` / `geo_job` as **actions**; Collection verdict + dossier deep links |
| **Reshape** | Specialized gates → single `compare` over catalog / open path expressions (n8n-style field reuse) |
| **Add** | `runContext` + `compare` (Wave 9); labeled catalog **ports** + `bind` (Wave 10); open `{{ }}` expressions (Wave 18); Context Tree + ExpressionField (Wave 19); `set` aliases + array picker (Wave 20) |
| **Drop from authoring** | `score_gate`, `issue_gate`, `geo_gate` (palette); free JavaScript / Code-Node |
| **Drop as nodes** | Result Overview, Share links, Reports, Settings, Saliency canvas — link from Run strip / Verdict only |

Node fields (quality):

| Field | On | Notes |
|-------|-----|-------|
| `url` | `scan`, `domain_scan`, `geo_job`, `start` | Empty → journey `finalUrl` / start URL |
| `companyName` | `geo_job` | Brand hint when URL empty |
| `scanMode` | `scan` | `single` (default) \| `deep` |
| `maxPages` | `domain_scan` | Optional crawl cap |
| `text` | `geo_job` | Optional queries — one prompt per line |
| `path` | `compare`, `set` | Catalog path or `{{ expression }}` (Wave 18+) |
| `op` | `compare` | `gte` \| `lte` \| `gt` \| `lt` \| `eq` \| `neq` \| `exists` \| `not_exists` |
| `value` | `compare` | Expected literal or expression (ignored for exists ops) |
| `alias` | `set` | Output key under `context.outputs[alias]` (Wave 20) |

### D — Brand (BRANDION capability) — Wave 24

Orchestration nodes only — config + sync Measured evaluate → catalog. Guideline studio / findings stay in BRANDION via deep links. Knowledge Pack facet `brand` activation remains separate (Phase 4).

| Kind | Role | Wave |
|------|------|------|
| `guideline` | **Config** — pick Collection Brandion guideline → `guidelineId` on extract/merge | **24** |
| `brand_measure` | BRANDION Measured evaluate (sync `POST …/analysis-runs`) — writes `brand.*` | **24** |

#### Keep / reshape / drop (brand)

| Decision | Item |
|----------|------|
| **Keep** | `guideline` config + `brand_measure` action; Collection deep link to Brandion evaluate |
| **Reshape** | Reuse `compare` over `brand.*` (no brand-specific gate kinds) |
| **Drop as nodes** | Launch-only Brandion chrome, KP distillate publish, PDF upload from the board |

Node fields (brand):

| Field | On | Notes |
|-------|-----|-------|
| `guidelineId` | `guideline`, `brand_measure` | Empty on measure → merge from upstream `guideline` config |
| `fixtureId` | `brand_measure` | Named Brandion fixture input (v1; default CD/demo kit) |
| `adapter` | `brand_measure` | `fixture` (default) — PDF/URL board upload deferred |

**Extract rule:** `guideline` is authoring-only for the Audion agent graph; before Brandion execute, merge `guidelineId` onto `brand_measure` when the measure node omits it.

### C — Orchestration (PLEXON)

| Kind | Role | Status |
|------|------|--------|
| `gate` | Journey live branch; Audion closed-set conditions | **Keep** (family A on canvas) |
| `hand_off` | Explicit AUDION ↔ CHECKION switch | **Deferred** — implicit handoff on segment boundary |
| `parallel` (node) | Sibling segments as a node kind | **Deferred** — use edge `parallel` + persona slots |
| `page` | Explicit page URL node | **Deferred** — `start.url` / empty quality URL fallback |
| `retest` | Re-run prior segment after change note | **Deferred** (Wave 23+) |

Do **not** add Family-C node kinds to the palette. Implicit handoff + control edges cover MVP.

## Edge kinds

Control (Audion V1 + walkable by runner): `then` | `when` | `otherwise` | `parallel`.

Authoring-only (Wave 10): **`bind`** — wires a closed catalog field from an action output port into `compare.path`. Runner **ignores** `bind` when walking the active path. Optional `bindPath` on the edge stores the catalog path (SoT for eval remains `compare.path`).

## Catalog paths + ports (Waves 9–10)

### Catalog paths (Wave 9)

Actions write typed bundles into `lastRun.context.outputs` (also aliased by root: `scan`, `domain`, `geo`, `journey`, `run`).

| Root | From | Paths (picker catalog) |
|------|------|------------------------|
| `scan` | page `scan` | `status`, `overallScore`, `url`, `issueCount`, `scores.accessibility`, `scores.seo`, `scores.performance`, `scores.ux`, `scores.eco`, `scores.best_practices`, `issues.criticalCount`, `issues.seriousCount`, `issues.issueCount` |
| `domain` | `domain_scan` | `status`, `overallScore`, `pageCount`, `issueCount`, `issues.criticalCount`, `issues.seriousCount`, `issues.issueCount` |
| `geo` | `geo_job` | `status`, `citedShare`, `geoFitness`, `overallScore`, `url` |
| `journey` | Audion segment | `taskCompleted`, `validEvidence`, `finalUrl` |
| `run` | orchestration | `url`, `startedAt` |
| `brand` | `brand_measure` | `status`, `guidelineId`, `runId`, `adapter`, `passCount`, `failCount`, `observationCount`, `passRate` |

Ops: `gte` \| `lte` \| `gt` \| `lt` \| `eq` \| `neq` \| `exists` \| `not_exists`.  
**Open path expressions (Wave 18+):** `compare.path` / `compare.value` and **all ExpressionField params** (`start`/`scan`/`domain_scan`/`geo_job` URL, `text`, `note`, `pattern`, `companyName`, …) accept bare catalog paths **or** `{{ … }}` (whole-field or mixed with literals), resolved against `context.outputs` at segment start. **No JS `eval`.** Catalog list = recommended picker / port labels only — not a hard evaluate whitelist.

### Catalog ports (Wave 10)

n8n-like I/O without open expressions:

| Side | Node | Ports |
|------|------|--------|
| **Out** | `scan` / `domain_scan` / `geo_job` / `success` / `brand_measure` | One labeled source handle per catalog leaf for that root (`out:scan.overallScore`, `out:journey.taskCompleted`, `out:brand.passRate`, …) |
| **In** | `compare` | Control `in` (Ablauf) + bind target `bind:path` (Wert) |
| **Out** | `compare` | Control `when` / `otherwise` (Pass/Fail) |
| **Config** | `persona` / `zielgruppe` / `guideline` | Ablauf in + Weiter out only (no catalog dump) |

Connecting `out:<catalogPath>` → `bind:path` (UI label **Wert**) sets `compare.path` and upserts a dashed `bind` edge. Path select remains a fallback. Journey/`run` paths stay picker-only this wave.

Node chrome: each kind declares a fixed I/O schema (`lib/collection-flow-node-ports.ts`). **Canvas cards are compact** (edge handle stacks + title/preview; critical selects only for persona/start/compare/gate). Full parameter editing (text, expressions, Context tree) lives in the **Inspector**. Legacy Wave-10 INPUT / Parameters / OUTPUT bands on the card are retired.

### Legacy gate → compare (on `ensureFlowDocument`)

| Legacy | Migrates to |
|--------|-------------|
| `score_gate` overall / `score_at_least` | `compare` `scan.overallScore` `gte` threshold |
| `score_gate` + `scoreKind` | `compare` `scan.scores.{kind}` `gte`/`lte` |
| `issue_gate` `critical_issues` | `compare` `scan.issues.criticalCount` `lt` minCount |
| `issue_gate` `no_critical_issues` | `compare` `scan.issues.criticalCount` `eq` 0 |
| `issue_gate` `serious_*` / `any_*` / `no_*` | analogous `issues.*` compares |
| `issue_rule_match` | `compare` `scan.issues.issueCount` `eq` 0 (regex dropped in Wave 9) |
| `geo_gate` cited / fitness | `compare` `geo.citedShare` / `geo.geoFitness` |

Journey closed-set conditions on family-A `gate` are unchanged.

## Graph rules

1. Exactly one `start` (journey family) **or** one `page` as entry — MVP prefers `start` with URL, optional immediate `scan` via `then`.
2. Capability segments are contiguous runs of family A **or** family B between orchestration nodes.
3. `gate` / `compare` (and legacy quality gates until migrated) require `when` + `otherwise`.
4. Terminals: journey `success`|`abandon` and/or `quality_ok`; Collection flow is complete when the **active path** reaches any terminal and required quality compares on that path are evaluated.
5. No cycles in MVP templates.
6. Every capability node carries optional `note` (persisted on Collection flow jsonb).

## Runtime model

```text
Plexon Collection Flow runner
  ├── resolve bindings (audion + checkion must be in_sync for full run)
  ├── walk active path
  ├── journey segment → AUDION journey agent → write journey.* bundle
  ├── quality actions → CHECKION scan/domain/geo → write scan|domain|geo.* bundles
  ├── evaluate compare nodes against runContext catalog
  └── emit CollectionFlowCursor + CollectionVerdict (+ lastRun.context)
```

### Signal bus / Run Context (Collection)

Plexon merges into `CollectionFlowRunContext`:

| Bundle | Origin |
|--------|--------|
| `journey` | Audion task/evidence/finalUrl |
| `scan` / `domain` / `geo` | Checkion action outputs (catalog) |
| `run` | url, startedAt |
| `correlation` | `platformProjectId`, audion/checkion ids |

Reuse existing handoff fields from `checkion-single-scan-trigger.md` (`platformProjectId`, `audionRunId`, `stepUrl`).

### Dispatch rules (MVP)

1. **Journey segment:** compile contiguous A-nodes to Audion `flow_graph` via existing Study-from-flow / agent start APIs.
2. **Scan node:** `POST {CHECKION}/api/scans` with mode, projectId, url, correlation — then materialize `scan.*` catalog (scores + issue counts).
3. **Compare:** evaluate only after required action bundles exist; missing path → fail (unless `exists`/`not_exists`).
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

**Wave 1:** Persist `lastVerdict` + `lastRun` metadata on the flow **jsonb**. Score signal = CHECKION contracts `overallScore`.

## Persistence (sketch)

| Store | Notes |
|-------|-------|
| `collection_test_flows` (Plexon) | `id`, `platform_project_id`, `name`, `flow` jsonb, `owner_id`, `template_id`, webhook fields (Wave 15), timestamps |
| Optional link | `audion_saved_flow_id` / template reference for imported journey subgraphs |
| Runs (Wave 15–17 / C2) | `collection_flow_runs` — status, trigger (`ui`/`webhook`/`service`/`assistant`), request/verdict/lastRun jsonb, optional callback; UI + Assistant + webhook share the same table |

Wave 1 ships the Drizzle table + migration `0005_collection_test_flows.sql`. Wave 15: `0006_collection_flow_triggers.sql`.

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
| **Drop** | Glass/MUI/Prismion `/board` island; product-only “Audion flow project”; free JS/JSONPath expressions; dumping Checkion report magazine onto Overview |
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
| **8A — Checkion quality catalog** | `scan.scanMode` single\|deep; `domain_scan`; `scoreKind` on `score_gate`; expanded `issue_gate` severity conditions; palette + RF/inspector + run BFF | Staging: deep page scan + domain crawl + dimension gate + serious_issues branch |
| **8B — GEO nodes** | `geo_job` + `geo_gate` (`cited_share_*`, `geo_fitness_*`); v3 `/api/geo-jobs` client; deep link `/geo/:id/overview` | Staging: GEO-only or journey→geo→gate; strip opens GEO overview |
| **9 — Run Context + Compare** | Typed `lastRun.context` catalog outputs; `compare` node; migrate/drop specialized gates from palette; inspector output tree | Staging: scan → compare `scan.scores.accessibility` + `scan.issues.criticalCount`; legacy docs auto-migrate |
| **10 — Catalog Port UX** | Labeled action output ports + compare `bind:path`; `bind` edges (authoring); path↔wire sync; closed catalog only | Staging: drag `scan.overallScore` → compare path; dashed bind wire; run still uses `compare.path` |
| **11 — Journey product nodes** | `persona` / `zielgruppe` config + extract merge; Frage/Action presets; `measureKey`; `success` journey catalog ports; palette groups Kontext/Schritte/Messung/Steuerung | Staging: Zielgruppe→Persona→Start→Action→Success; bind `journey.taskCompleted`; personas from Collection catalog |
| **12 — Authoring polish** | Delete/Entf; duplicate; validate-before-Testen; dirty auto-save on run; lean templates `zielgruppe`→`persona`→…→optional Frage | Staging: select→Entf/duplicate; Testen blocks incomplete compare/journey; new flow has Zielgruppe |
| **13 — Compare presets + parallel authoring** | Quality palette presets (score/a11y/issues/journey/geo); `parallel` out on Zielgruppe/Persona; add sibling Persona (authoring only; runtime still one extract persona) | Staging: drop Compare Score≥70; Parallel handle + toolbar adds second Persona wire |
| **14 — Parallel persona runtime** | Detect Zielgruppe→Persona `then`+`parallel` siblings; sequential Audion segments (one personaId each); aggregate `journey.taskCompleted`/`validEvidence` (AND); catalog `personaCount`/`allTaskCompleted`; live board chains slots | Staging: two Personas → Testen runs both → quality once with AND |
| **15 — Flow triggers + node collision** | Per-flow webhook secret + service-secret trigger; `202` + poll `collection_flow_runs`; optional `callbackUrl`; closed body `url?`/`companyName?`; AABB snap so nodes cannot overlap | Staging: rotate secret → POST webhook → poll complete; drag onto node snaps free |
| **16 — Board context menu** | Right-click authoring via shared `@msqdx/ui` `ContextMenu` (node: dup/delete/‖P/inspector; pane: Bausteine/undo) | Staging: right-click node → Duplizieren; pane → Bausteine |
| **17 — Run history** | UI Testen (+ journey→quality) writes `collection_flow_runs` (`trigger: ui`); `GET …/runs` list; Historie dock paints past verdict without re-exec | Staging: Testen → row in Historie; select older run → node paint + strip |
| **18 — Open path expressions** | Safe `{{ }}` dialect (no eval); compare path/value resolve against full context JSON; richer issue/score bundles; catalog = picker hint | Staging: `{{ scan.issues[0].ruleId }}` / bare path still works |
| **19 — Expression UI** | `@msqdx/ui` JsonTree + ExpressionField; inspector Context Tree insert into params | Staging: click leaf → inserts `{{ path }}` into Compare path |
| **20 — set + arrays** | `set` node aliases into `outputs`; array expand/insert in tree; catalog ports stay curated leaves | Staging: set alias → compare `$('alias')` / path |
| **23 — EQC as Collection flow** | Typed EQC nodes (`research_brief` … `human_confirm`); no generic agent | Staging: EQC path pauses on confirms |
| **24 — Brandion brand nodes** | Family D: `guideline` config + `brand_measure` (sync fixture evaluate); catalog `brand.*`; palette group Marke; Compare presets passRate / failCount | Staging: Guideline → Brand Measure → Compare `brand.failCount eq 0`; deep link Brandion evaluate |
| **Later** | Canvas `trigger`/cron nodes; concurrent multi-job live; multi-user live; saliency; re-run from history; purge UI; free JS Code-Node; board PDF upload for brand_measure | Out of MVP |

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

- Graph SoT stays `collection_test_flows`. Node kinds = Audion closed set (`prompt`/`observe`/`action`/`gate`/`message`/`measure`/`success`/…) **plus** quality (`scan`/`domain_scan`/`score_gate`/`issue_gate`/`quality_ok`) and legacy opaque `journey`.
- Edges use Audion kinds `then`|`when`|`otherwise`|`parallel` (stored as `edgeKind`; score/issue gates also use `when: pass|fail`).
- Board chrome SoT: `@msqdx/ui` `.msqdx-flow-*` (`flow-board-chrome.md`) — not a Plexon-only CSS fork.
- Save via `PATCH …/flows/:flowId` with full `flow` document; Undo is session-local.
- Wave 6: `POST …/run/journey` → poll `GET …/journey-jobs/:jobId` → `POST …/run` with journey handoff for Checkion + verdict.
- Soft-Q edit remains Audion Wave; board offers Evaluate deep link + read-only Soft-Q summary when wave ids present.

## Wave 8A implementation notes

- `scan.scanMode`: `POST {CHECKION}/api/scans` with `mode: single|deep` (Audion journey handoff still prefers `single` for step URL).
- `domain_scan`: `POST {CHECKION}/api/domain-scans` `{ projectId, url, maxPages? }` → poll `GET /api/domain-scans/:id` (`overallScore`, status). Deep link `pathCheckionDomainResult`.
- `score_gate.scoreKind`: when set and ≠ `overall`, fetch `GET /api/scans/:id/scores` and compare that card’s `value` (0–100) to `threshold`. Domain scans use `overallScore` only in 8A.
- `issue_gate`: evaluate against expanded `IssueGateSignals` (`criticalCount`, `seriousCount`, `issueCount`, `ruleIds`).
- Palette Quality section: `scan`, `domain_scan`, `score_gate`, `issue_gate`, `quality_ok`.
- `lastRun` may include `scanMode`, `domainScanId` when domain path used.

## Wave 8B implementation notes

- `geo_job`: `POST {CHECKION}/api/geo-jobs` with `{ projectId, platformProjectId?, url?, companyName?, queries? }` — at least one of url/companyName; queries from node `text` (newline-separated) when present.
- Poll `GET /api/geo-jobs/:id` until `completed`/`failed`; parse `job.citedShare`, `eeat.geoFitness` / `job.overallScore`.
- `geo_gate`: closed conditions `cited_share_at_least` \| `cited_share_below` \| `geo_fitness_at_least` \| `geo_fitness_below` + `threshold` (default 70).
- Run path: if graph has page `scan`/`domain_scan`, run that first; if `geo_job` present, run GEO after (or alone when no page scan). `qualityPassed` ∧= `geoGatePassed` when `geo_gate` present.
- Deep link: `pathCheckionGeoOverview(jobId)` → `{CHECKION}/geo/{id}/overview`.
- Palette: add `geo_job`, `geo_gate` under Quality.
- `lastRun.geoJobId` when GEO ran.

## Wave 9 implementation notes

- Actions (`scan`, `domain_scan`, `geo_job`) write catalog bundles into `lastRun.context.outputs` (roots `scan`|`domain`|`geo` plus per-nodeId).
- New node `compare`: fields `path`, `op`, `value`; dual `when`/`otherwise` handles.
- `ensureFlowDocument` → `migrateLegacyQualityGates` converts `score_gate`/`issue_gate`/`geo_gate` → `compare` and rewires edges.
- Palette Quality: `scan`, `domain_scan`, `geo_job`, `compare`, `quality_ok` (no specialized gates).
- Templates emit `compare` (e.g. `scan.overallScore` `gte` 70; issues template adds `scan.issues.criticalCount` `lt` 1).
- Verdict: `compareResults[]` + `qualityPassed` = AND of compares; legacy score/issue/geo flags kept as derived compat.
- Inspector: Output tree for action nodes; compare shows path/actual/pass.
- Helper: `lib/collection-flow-run-context.ts`.

## Wave 10 implementation notes

- Edge kind `bind` + optional `bindPath`; RF handles `out:<path>` → `bind:path`.
- Action nodes (`scan`/`domain_scan`/`geo_job`): Outputs strip with one Handle per catalog leaf for that root; control `then` stays separate.
- Compare: left control `in` + `bind:path`; path select remains; op/value literals only.
- Board: `isValidConnection` / `onConnect` for bind (sets path, replaces prior bind); path change upserts bind to matching producer; bind delete clears path when matched.
- Runner and journey extract skip `bind` edges.
- Helper: `catalogPortsForActionKind` / `isCatalogBindConnection` in run-context + canvas.

## Wave 11 implementation notes

- Config kinds `persona` / `zielgruppe`: fields `personaId`/`personaName` / `targetGroupId`/`targetGroupName`/`segment`; omitted from Audion agent graph; merge onto `start` in `extractJourneyFlowFromDocument`.
- `measure.measureKey` + Frage presets; Action presets via `presetId` + starter `text` (kinds stay `measure`/`action`).
- `success` (and opaque `journey`) expose `journey.*` catalog output ports; Compare Wert may bind them.
- Palette groups: Kontext / Schritte / Messung / Steuerung + Quality; pickers load Collection Audion catalog from dashboard summary.
- Template `journey-quality*`: `persona` → `start` → `action` → `success` → quality spine.
- Helper: `lib/collection-flow-presets.ts` · ports in `lib/collection-flow-node-ports.ts`.

## Wave 12 implementation notes

- Delete: RF selection must not be blocked by node-body `stopPropagation`; `deleteKeyCode` Backspace/Delete; toolbar delete via `removeNodesFromRfGraph` (clears bind paths).
- Duplicate: selected RF node(s) offset + new ids; no edges copied (author reconnects).
- Validate-before-Testen (`lib/collection-flow-validate.ts`): require `start`; journey segment needs compile-ready extract; each `compare` needs catalog `path`; warn when `persona` node lacks `personaId`.
- Dirty canvas: Testen auto-saves snapshot before run (server reads persisted flow).
- Templates: `zielgruppe` → `persona` → `start` → `action` → `success` → optional `measure` (ease) → quality spine.

## Wave 13 implementation notes

- Quality palette presets (`PALETTE_QUALITY_GROUPS`): Compare Score ≥70 / A11y / keine Criticals / Journey done / GEO cited; plus Scan / Domain / GEO / Quality OK with German labels — still kinds `compare`|`scan`|… + `presetId`.
- Zielgruppe/Persona expose control out `parallel` (label Parallel) beside Weiter.
- `addParallelPersonaSibling`: toolbar adds a second Persona wired with `edgeKind: parallel` from the same Zielgruppe (or from selected Persona’s source). Runtime extract still merges **one** nearest persona onto `start`; validate warns when parallel persona edges exist.
- Helper: quality presets in `lib/collection-flow-presets.ts`; parallel helper in `lib/collection-flow-canvas.ts`.

## Wave 14 implementation notes

- `listJourneyPersonaSlots(doc)`: Zielgruppe out-edges `then` (primary) + `parallel` (siblings) → Persona nodes; fallback single reverse-find when no slots.
- `extractJourneyFlowFromDocument(doc, url, { personaNodeId })` merges that Persona (+ Zielgruppe segment) onto `start`.
- Sync `POST …/run`: sequential `runAudionJourneySegment` per slot; AND-aggregate task/evidence; primary/last job ids for rollup; `lastRun.journeyPersonaRuns[]`.
- Live `POST …/run/journey`: `personaNodeId` body; board chains slots then one quality handoff with aggregates.
- Catalog: `journey.personaCount`, `journey.allTaskCompleted` (+ existing AND fields). No free expressions.
- Validate: parallel siblings require `personaId`; authoring-only warning removed.

## Wave 15 implementation notes

- **Triggers (HTTP, no canvas node):** `POST …/flows/:flowId/triggers/webhook` (Bearer `whsec_…` or secret header) and `…/triggers/service` (`PLEXON_SERVICE_SECRET` + `X-Plexon-Contract-Version`). Response `202` `{ runId, statusUrl }`; poll `GET …/runs/:runId`.
- Closed body only: `url?`, `companyName?`, optional `callbackUrl` (POST once with `{ runId, flowId, platformProjectId, verdict, lastRun }`).
- Table `collection_flow_runs` + flow columns `webhook_enabled`, `webhook_secret_hash`, `webhook_secret_hint`. Rotate via `POST …/webhook/rotate`; enable via `PATCH` `{ webhookEnabled }`.
- Shared executor `lib/collection-flow-execute.ts` (UI sync `…/run` + async worker). Still updates flow `lastVerdict`/`lastRun`.
- **Node collision:** `lib/collection-flow-collision.ts` — on drag-stop / palette / duplicate / ‖P, snap AABB with gap so nodes cannot stack. Free move while dragging.
- **Auto-layout:** Toolbar **Anordnen** — `lib/collection-flow-layout.ts` layers nodes left-to-right along control edges (`then` / `parallel` / `when` / `otherwise`), stacks branches vertically with gap; `start` nodes sit lower (template rhythm). Undoable; marks flow dirty.

## Wave 16 implementation notes

- Right-click uses `@msqdx/ui` `ContextMenu` (central DS). Board supplies items only.
- Node: Duplizieren, Löschen, Parallel-Persona (zielgruppe/persona), Inspector. Pane: Bausteine, Rückgängig. Disabled while run busy. No Testen/Save/Webhook in menu.

## Wave 17 implementation notes

- **Shared run log:** every completed UI sync `POST …/run` and live journey→quality handoff write `collection_flow_runs` with `trigger: 'ui'` (create-at-start as `running`, then `complete`/`error`). Flow jsonb `lastVerdict`/`lastRun` still updated for compatibility.
- Live path: first `POST …/run/journey` creates the history row (`historyRunId`); quality handoff / journey abort patches the same row (one Testen = one history entry).
- **List:** `GET …/flows/:flowId/runs?limit=` (default 30, max 50), newest first; session view/edit (Knowledge Pack ACL). Detail `GET …/runs/:runId` unchanged.
- **Historie dock:** toolbar **Hist**; select past run → paint via `nodeStatesFromVerdict` + strip links (read-only; no re-exec). **Aktuell** clears selection back to live / newest.

## Wave 18 implementation notes

- **Expressions:** `lib/collection-flow-expression.ts` — `{{ path }}`, `{{ $('nodeId').json.x }}`, `{{ $json.x }}`, bare paths; walker supports `a.b[0].c`. No `eval`.
- **Templates:** `resolveTemplateString` substitutes embedded `{{ … }}` chips inside literals (ExpressionField mixed mode). Whole-field expressions still use `resolveExpression`.
- Compare `path`/`value` resolve via expressions; validate warns on bad `{{` syntax; unknown catalog path is no longer a hard error.
- **All string params at run:** Before each capability segment, `resolveDocumentStringParams` clones nodes with resolved `url`/`urlKey`/`text`/`note`/`pattern`/`companyName`/`path`/`value` (and expression-like `alias`/`measureKey`). Saved document stays unresolved. Journey extract/AUDION and GEO queries consume the resolved snapshot. Start config is seeded into `outputs[startId]` first so `$('n-start').json.url` works. Unresolved expressions become empty (not forwarded as placeholders). Empty quality URL still falls back to start URL. `run.url` is the resolved base URL.
- **Journey limit:** Expressions inside Journey steps only see pre-journey context (`start`, `run`, prior quality). Mid-journey step outputs are not in Plexon context until the Audion segment finishes (`journey.*`).
- Scan/domain bundles may include `issues.items[]` (`ruleId`, `severity`, …) for open paths.

## Wave 19 implementation notes

- DS: `@msqdx/ui` `JsonTree` + `ExpressionField` (Plexon wires via `lib/msqdx-ui.ts`).
- Inspector shows full `lastRun.context.outputs` tree; insert writes `{{ … }}` into focused ExpressionField (compare path/value, start url).

## Wave 20 implementation notes

- Node kind `set`: `path` = source expression, `alias` = output key under `outputs[alias]`; applied before compare eval.
- JsonTree expands arrays; ports stay curated catalog leaves (no RF handle explosion).

## Compact RF chrome (post Wave 20)

- Canvas cards drop INPUT / Parameters / OUTPUT bands: edge handle stacks + title/preview; Inspector owns text/expressions/Context.
- Collision fallback size `220×120` matches compact cards.

## Wave 21 — n8n node editor overlay

- Node click opens **fullscreen** `FlowNodeEditorShell` (`@msqdx/ui`): **INPUT** (transitive ancestor schemas / run outputs) | **Parameters** (all fields) | **OUTPUT** (node bundle + run steps).
- Upstream scoping: `lib/collection-flow-inspector-inputs.ts` + `lib/collection-flow-output-schemas.ts`; **SchemaTree** (nested object shape + type badges) replaces flat JsonTree in INPUT/OUTPUT; click inserts `$('nodeId').json…` into the focused ExpressionField.
- **Per-kind OUTPUT schema:** journey steps (`text`/`note`/`label`), `start` config (`url`/`maxSteps`/persona), `compare`/`gate` verdict fields, catalog bundles for scan/domain/geo/journey actions; terminals (`abandon`, `quality_ok`) show no schema tree.
- **Per-kind Parameters:** all model fields exposed in Inspector — `start.maxSteps`, `observe.observeSeconds`, `measure.measureKey`, `gate.pattern`, `geo_job.companyName`, `domain_scan.maxPages`; URL edits derive generic labels via `lib/collection-flow-url.ts`.
- **Pre-run schema:** INPUT shows predicted output shape per ancestor node kind before Testen; after a run, leaf values overlay the same tree. No global catalog dump when there are no incoming edges.
- Overlay sheet is opaque with heavy backdrop blur.
- Right FloatingPanel inspector retired for Collection Flow boards.

## Wave 22 — straighten / thin / runtime parity

### Keep / reshape / drop

| Decision | Item |
|----------|------|
| **Keep** | Palette A+B; `gate` vs `compare`; `set`; implicit A→B handoff; expression templates |
| **Drop from roadmap** | `page`, `hand_off`, `retest` as nodes; Parallel-**node** (edge `parallel` stays) |
| **Thin** | Opaque `journey` node: `ensureFlowDocument` expands `journeyFlow` into first-class canvas nodes when the graph only has a legacy `journey` stub; no new opaque docs |
| **Legacy** | `score_gate` / `issue_gate` / `geo_gate` — migrate-on-load only; never palette |
| **Defer (Wave 23+)** | Soft-Q values invented from Checkion lenses; multi-GEO providers; live `{{ }}` **inside** an AUDION step |

### Runtime deliverables

1. **Domain issue parity:** `domain.issues.items[]` populated like page scan (`ruleId`, `severity`, `title`, …) so open-path compares work after `domain_scan`.
2. **Post-journey node context:** After the Audion segment finishes, seed `outputs[nodeId]` from agent steps (`text` / `result` / `label`). Re-resolve quality URL / companyName / geo queries against that context + `journey.*`. Intra-segment expressions remain impossible until AUDION exposes mid-step context.
3. **Historie Re-Run:** History dock action **Erneut ausführen** starts a fresh Testen on the **current** document (new run id; paint of the past run stays until the new run finishes).
4. **Catalog hygiene:** SchemaTree already enriches `issues.items` for `scan`/`domain`; domain runtime must fill items.

## Open questions (Wave 24+)

- Richer Soft-Q mapping from Checkion lenses — product later.
- Multi-provider GEO models beyond OpenAI defaults — product later.
- Intra-Audion step expression resolution — needs AUDION contract.
- EQC Flow flag default-on cutover complete; archive legacy playbook path.
- Shared Capability Catalog with Assistant (Wave C0–C4) — see `capability-catalog.md`; do **not** expose orchestration kinds as Agent tools.

## Wave 23 — Event Quick Check on Collection Flow

@seealso [`eqc-as-collection-flow.md`](./eqc-as-collection-flow.md)

- **Surface:** `/event-quick-check` UX kept; Flow = executor + graph SoT. Bootstrap (Collection + bindings) outside canvas.
- **Typed nodes:** `research_brief`, `competitors_suggest`, `persona_bootstrap`, `suggest_queries`, `human_confirm` (`confirmKind`).
- **Template:** `eqc-quality-v1` — creatable from Collection Flows gallery (`POST …/flows` with `templateId=eqc-quality-v1`, optional `depth=quick|complete`). Also upserted when Event Quick Check bootstraps.
- **Pause/resume:** run status `awaiting_input`; resume via `POST …/run` with `resume` + payload.
- **Out:** ECHON, generic agent/code nodes, replacing EQC UI with Board.
- **Flag:** `EQC_FLOW_RUNTIME`.
