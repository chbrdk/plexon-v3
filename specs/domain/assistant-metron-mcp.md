# Assistant ↔ METRON MCP

**Status:** Accepted — 2026-09-14 (Phase 1 read + Phase 2 writes + Catalog)  
**Depends:** `metron-v3/specs/domain/mcp-server.md` · `specs/domain/metron-capability.md` · `capability-catalog.md` METRON set  
**Knowledge:** `knowledge/metron-mcp-assistant.md` · `knowledge/paths.md` · `metron-v3/knowledge/mcp-server.md`

## Purpose

Wire METRON KPI/dashboard MCP tools into the Plexon free-chat orchestrator so operators can list projects, datasets, KPIs, and dashboards — summarize boards — and (with confirm) create dashboards / install starter packs / suite-sync — without inventing analytics facts.

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
| `metron_datasets` | `^metron_datasets_` |
| `metron_kpis` | `^metron_kpis_` |
| `metron_dashboards` | `^metron_dashboard_(get|summarize)$` / list |
| `metron_write` | `dashboard_create` / `kpi_starter_pack_install` / `suite_connectors_sync` |

Planner intent `metron_analytics` when prompt matches KPI/dashboard/metron patterns and `hasMetronMcp`. Write verbs set `allowWriteTools` + confirm patterns.

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
| `metron_dashboard_get` | `metric_grid` (kpi_tile/gauge) + `chart` (first widget with `chartPoints`) + `link_list` |
| `metron_dashboard_summarize` | `metric_grid` from KPI/gauge lines + `link_list` deep link |

Builders: `lib/assistant/ui-blocks/build-metron-dashboard-ui.ts`. Same chat organisms as GEO/Scan (`UiMetricGrid` / `UiChartBlock` / `UiLinkList`).

### Public share

One-click share after get/summarize Auto-UI → `POST /api/assistant/metron/dashboards/share` → `/share/metron/{token}`. Spec: `assistant-metron-share.md`.

### Follow-up prompts

After METRON list/get/summarize turns, `attachRecommendationsToMetadata` merges METRON-specific `followUpPrompts` (show/summarize board, share via UI tip, confirm-write discoverability for starter pack / dashboard create). Builder: `lib/assistant/insights/metron-follow-ups.ts`.
