# Event Quick Check as Collection Flow

**Status:** Wave 23 — accepted for implementation  
**Owner:** PLEXON v3  
**Companions:** [`collection-test-flow.md`](./collection-test-flow.md) · [`capability-catalog.md`](./capability-catalog.md) · [`ui-migrate-event-quick-check.md`](./ui-migrate-event-quick-check.md) · [`collection-projects.md`](./collection-projects.md)

## Purpose

Run Event Quick Check (ohne ECHON) on the **Collection Test Flow** runtime:

- `/event-quick-check` stays the product UX (review gates, magazine report, history).
- `collection_test_flows` is graph SoT + executor.
- Bootstrap (Collection + AUDION/CHECKION bindings) stays **outside** the canvas.

## Non-goals

- ECHON market research
- Generic LLM / Code nodes
- Replacing EQC UI with the Flow Board
- Brandion / Soft-Q / Intra-Audion mid-step expressions
- Embedding a **full Audion persona chat** inside `/event-quick-check` (second chat stack)
- Merging Audion `/chat` into the Central Assistant flyout

## Persona talk (after bootstrap) — locked

| Choice | Detail |
|--------|--------|
| SoT UI | Audion chat-api + `/chat` / `/chat/embed` (persona workspace) |
| EQC UX | Magazine + public share → `@msqdx/ui` `ChatOverlay` iframe of Audion `/chat/embed`; fallback deep-link full `/chat` |
| Query contract | `personaId` + `projectId` (+ `embed=1`, optional `theme`) — see Audion `specs/domain/chat-embed.md` |
| Guest budget | Public/embed unauthenticated: 5 turns / ~800 chars / 30 min TTL (server-enforced) |
| Assistant | Short MCP `audion_chat` optional; prefer handoff for full sessions |
| Catalog | Planned `audion.persona_chat` Agent-only — see Capability Catalog Wave C5 |

Knowledge: `knowledge/eqc-persona-chat.md`.

## Mapping (EQC step → Flow)

| EQC step | Flow |
|----------|------|
| prepare URL | `start` |
| company_research | `research_brief` |
| company_brief_confirm | `human_confirm` (`confirmKind=brief`) |
| create_project / ensure_* | Bootstrap before execute |
| competitors_suggest / confirm | `competitors_suggest` + `human_confirm` (`competitors`) |
| domain_scan (+ deep complete) | `domain_scan` (+ `human_confirm` `deep_scan` when depth=complete) |
| parallel_research | folded into `persona_bootstrap` |
| persona_bootstrap | `persona_bootstrap` |
| geo_questions / confirm | `suggest_queries` + `human_confirm` (`geo_queries`) |
| geo_check | `geo_job` |
| aggregate / report | EQC report reads `lastRun.context` |
| echon_* | skipped / out |

## Typed nodes

| Kind | Writes catalog root | Notes |
|------|---------------------|-------|
| `research_brief` | `brief` | Homepage signals + LLM brief |
| `competitors_suggest` | `competitors` | CHECKION suggest → `items[]` |
| `persona_bootstrap` | `persona` | Creates personas; ids for GEO/journey |
| `suggest_queries` | `queries` | `items[]` + optional byPersona |
| `human_confirm` | same as draft root | Pauses run (`awaiting_input`); resume applies edits |
| `geo_job` | `geo` | CHECKION competitive job. **Queries MUST come from confirmed `queries.items`**, not the pre-confirm `suggest_queries` node alias. |

`human_confirm.confirmKind`: `brief` \| `competitors` \| `geo_queries` \| `deep_scan`.

**GEO confirm (required):** Resume `geo_queries` writes `buildQueriesCatalogBundle(payload)` to catalog root `queries` **and** to the `suggest_queries` node alias (`n-suggest-q`). Sibling field `measurements` (`recall` | `live`, one or both) is stored on `queries.measurements` — never stuffed into the questions array. **EQC default when omitted:** `['recall', 'live']` (both layers). User may deselect one tile before confirm.

`geo_job` resolves prompts via `resolveGeoJobQueriesFromContext` and layers via `resolveGeoJobMeasurementsFromContext`. **One CHECKION job per measurement** — run **in parallel** when multiple layers are selected; page scan only on the primary (first) layer. Do not mix `citedShare`. Catalog `geo.*` is the **primary** (first selected) layer for compare gates; `geo.layers[]` holds every layer.

**Magazine (dual layers):** WHEN `geoLayers.length > 1`, the report MUST render **one** GEO band with (1) a compact Layer-1 vs Layer-2 compare strip (`citedShare` / fitness + winner verdict) and (2) an exclusive layer `ToggleGroup` that switches SoV, radar, and the citation dossier. The **snapshot dials** MUST stay fixed and MUST NOT follow the layer switch: large **GEO Score** (= cross-layer citation / `citedShare`, never collapsed onto fitness) and **GEO Fitness** (on-page only). No Prompts dial. Do **not** stack two full GEO chapters. Confirm tiles and parallel jobs are unchanged. PDF stays on primary `report.geo`.

**Plexon EQC model budget:** GEO jobs from `/event-quick-check` are measurement-scoped:
- **Layer 1 (`recall`):** broader multi-provider set — GPT-5.6 `luna` / `terra` / `sol`, Claude Opus 5 / Sonnet 5 / Haiku 4.5, Gemini 3.6 Flash (`EQC_GEO_RECALL_MODELS`).
- **Layer 2 (`live`):** curated cost/latency trio only — `gpt-5.6-terra`, `claude-sonnet-5`, `gemini-3.6-flash` (`EQC_GEO_LIVE_MODELS`).

`sanitizeEqcGeoModels(models, measurement)` enforces the allow-list per layer. Broader CHECKION catalogs may exist elsewhere; EQC must not send live Layer-2 jobs with the full Layer-1 set.

**Cited share hydration:** Magazine compare strip and GEO Score MUST resolve `citedShare` from CHECKION presence/solo (or reconstruct from citation dossier / own SoV) when the catalog scalar is null or draft `0`. Never leave Layer compare as `—` when citations show the brand on rank 1.

**Domain-scan poll budget:** Plexon MUST poll CHECKION `domain_scan` with a maxPages-scaled budget (`domainScanPollMaxMs`), floored at 6 min. Budget is **not** capped by HTTP `maxDuration` (confirm routes return **202** and finish in-process). Hang-safety ceiling = scaled budget for product max pages (`EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MAX`).

EQC confirm routes that kick off long work (`POST …/company-brief`, `…/competitors`, `…/geo-questions`) return **202** immediately and finish the flow in-process; the client polls `GET …/runs/:id` until `completed`, the next human gate (`awaitingCompetitors` / `awaitingGeoQuestions` / `awaitingDeepScan`), or `failed` (avoids proxy timeout on domain scan + dual-layer GEO). Background execute failures MUST mark the workflow run `failed` (not only console.error) so the UI leaves the Domain step. When pausing at GEO, steps through `domain_scan` MUST be marked `done` before `geo_questions_confirm` is `running`.

**Domain-scan id + GET reconcile:** Persist `eqcDomainScanId` on the workflow result as soon as CHECKION returns a scan id (before the long poll). `GET …/runs/:id` MUST, when status is `running`, no human gate is open, competitors/brief are already confirmed, and CHECKION reports that scan (or a host-matched completed scan) as completed, resume `continue_after_*` with `preferDomainScanId` so persona + GEO confirm run without starting a duplicate crawl. Skip reconcile while an in-process execute lock is held; cooldown via `eqcDomainReconcileKickedAt`. Opening a still-`running` run in the UI MUST keep polling `GET …/runs/:id` until a human gate, `completed`, or `failed` (so reconcile kicks are visible).

The GEO-questions confirm panel **must** show the same layer switch as CHECKION `/scan` (multi-select). Edited questions must appear in the magazine GEO chapter (even when a persona exists) and in the new CHECKION job(s).

## Template

**Id:** `eqc-quality-v1`

**Where it appears:** Collection Flows gallery — **Create Event Quick Check** / **Create Event Quick Check (complete)** (`POST /api/platform/projects/:id/flows` with `templateId=eqc-quality-v1` and optional `depth`). Also upserted when `/event-quick-check` bootstraps a Collection.

Linear spine (quick):  
`start` → `research_brief` → `human_confirm(brief)` → `domain_scan` → `persona_bootstrap` → `suggest_queries` → `human_confirm(geo_queries)` → `geo_job` → `compare`s → `quality_ok` / `abandon`.

Complete depth adds `competitors_suggest` + confirms and optional `human_confirm(deep_scan)` after domain crawl kickoff.

## Pause / resume

- Run status `awaiting_input` on `collection_flow_runs`.
- Persist `lastRun.context`, `awaitingNodeId`, `confirmKind`, draft bundles.
- Resume: `POST …/flows/:flowId/run` `{ resume: true, historyRunId, confirmKind, payload }`.
- EQC confirm routes delegate to resume when `EQC_FLOW_RUNTIME` is on.

## Feature flag

`EQC_FLOW_RUNTIME` — default **on**. Explicit off: `0` / `false` / `off`. Legacy playbook when off.

## Catalog paths (picker)

- `brief.displayName`, `brief.industry`, `brief.summary`, `brief.targetAudienceHint`, `brief.companyContext`
- `competitors.items` (array)
- `persona.id`, `persona.name`, `persona.segment`
- `queries.items`, `queries.text` (joined lines for `geo_job.text`), `queries.measurements` (`recall` | `live`[])
