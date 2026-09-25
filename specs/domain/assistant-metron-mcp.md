# Assistant ↔ METRON MCP

**Status:** Accepted — 2026-09-25 (Wave 4: multi-chart Auto-UI · `kpi_create` · Suite→Overview follow-ups)  
**Depends:** `metron-v3/specs/domain/mcp-server.md` · `specs/domain/metron-capability.md` · `capability-catalog.md` METRON set  
**Knowledge:** `knowledge/metron-mcp-assistant.md` · `knowledge/paths.md` · `metron-v3/knowledge/mcp-server.md`

## Purpose

Wire METRON KPI/dashboard MCP tools into the Plexon free-chat orchestrator so operators can list projects, datasets, KPIs, and dashboards — **evaluate KPIs (server SSOT)** — summarize boards — and (with confirm) create KPIs / dashboards / install starter packs / suite-sync — without inventing analytics facts.

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `METRON_MCP_URL` | plexon-v3 Coolify | Public FQDN of `metron-mcp` (prefer over internal hostname across projects) |

Helper: `getMetronMcpUrl()` in `lib/constants.ts`. Staging: `https://hh0pad7nwoupxnydpd7shb9r.projects-a.plygrnd.tech`.

## Auth

1. `metron-mcp` holds `PLEXON_SERVICE_SECRET` (shared with Product).  
2. Orchestrator injects session `actorUserId` into every `metron_*` tool call except `health` (`injectMetronToolArgs`).  
3. MCP → Product: `X-Service-Secret` + `X-Plexon-User-Id`.

## Entitlement / host product

`useMetronMcp` via `resolveUseMetronMcp` / `resolveUseProductMcp` when `METRON_MCP_URL` is set **and** any of:

1. product entitlement `metron` is `active`, or  
2. `pageContext.product` is `metron` **or** another platform shell, or  
3. any sibling product entitlement is `active`

Connectivity block: `buildMetronIntegrationContextBlock`.

## Tool families

| Family | Anthropic name patterns |
|--------|-------------------------|
| `metron_ops` | `^metron_health$` |
| `metron_projects` | `^metron_projects_` |
| `metron_datasets` | `^metron_datasets_` / `^metron_dataset_get$` |
| `metron_kpis` | `^metron_kpis_` / `^metron_kpi_(get\|evaluate\|summarize)$` (Anthropic: underscores) |
| `metron_dashboards` | list / get / summarize (not create) |
| `metron_write` | `dashboard_create` / `kpi_create` / `kpi_starter_pack_install` / `suite_connectors_sync` |

Planner intent `metron_analytics` when prompt matches **metron** / Collection KPI+dashboard (not bare `report`/`analytics`) and `hasMetronMcp`. Write verbs set `allowWriteTools` + confirm patterns.

### Page context (Wave 3)

Metron host publishes `entityType` + `entityId` on `/dashboards/:id` (`dashboard`) and `/kpis?` detail when available. `injectMetronToolArgs` fills missing `id` for `dashboard_get` / `dashboard_summarize` / `kpi_get` / `kpi_evaluate` / `kpi_summarize` / `dataset_get` from page context. For writes, injects `platformProjectId` for list/create/sync tools including `kpi_create`.

## Capability Catalog mapping

| Cap id | MCP (Anthropic) |
|--------|-----------------|
| `metron.dashboards.list` | `metron_dashboards_list` |
| `metron.dashboard.summarize` | `metron_dashboard_summarize` |
| `metron.dashboard.create` | `metron_dashboard_create` |
| … | see `capability-catalog.md` METRON set |

## Orchestrator

MCP fetch branch beside Videon using `fetchCheckionMcpTools` against `getMetronMcpUrl()`.

### Auto UI

| Tool | Block |
|------|-------|
| `metron_dashboards_list` | `link_list` — dashboard titles + absolute METRON deep links |
| `metron_dashboard_get` | `metric_grid` (kpi_tile/gauge) + up to `UI_BLOCK_LIMITS.maxChartSeries` `chart` widgets with `chartPoints` + `link_list` |
| `metron_dashboard_summarize` | `metric_grid` from KPI/gauge lines + `link_list` deep link |
| `metron_kpis_list` / `metron_kpi_evaluate` / `metron_kpi_summarize` | `metric_grid` (+ period label from provenance when present) + deep link |
| `metron_datasets_list` / `metron_dataset_get` | `link_list` + honesty hint when sample-evaluated |

Builders: `lib/assistant/ui-blocks/build-metron-dashboard-ui.ts`. Same chat organisms as GEO/Scan (`UiMetricGrid` / `UiChartBlock` / `UiLinkList`).

### Public share

One-click share after get/summarize Auto-UI → `POST /api/assistant/metron/dashboards/share` → `/share/metron/{token}`. Spec: `assistant-metron-share.md`. Share snapshot may include `charts?` (multi-chart).

### Follow-up prompts

After METRON list/get/summarize/suite-sync turns, `attachRecommendationsToMetadata` merges METRON-specific `followUpPrompts` (show/summarize board, share via UI tip, confirm-write discoverability for starter pack / dashboard create / `kpi_create`). Builder: `lib/assistant/insights/metron-follow-ups.ts`.

### Chat playbook: Suite sync → Overview Board

Not a Collection Flow node. Guided confirm chain via follow-ups + connectivity prompt:

1. `metron_suite_connectors_sync` (`kind=checkion`, human_gate)  
2. `metron_kpi_starter_pack_install` (`packId=checkion-site-health`, human_gate)  
3. `metron_dashboard_create` name `CHECKION site health` (human_gate)

Never auto-create on sync — mirrors product Apply path (`checkion-site-health-kpi-pack.md`).
