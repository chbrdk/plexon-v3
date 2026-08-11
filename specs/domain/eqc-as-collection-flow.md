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

`human_confirm.confirmKind`: `brief` \| `competitors` \| `geo_queries` \| `deep_scan`.

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
- `queries.items`, `queries.text` (joined lines for `geo_job.text`)
