# Assistant ↔ METRON MCP

**Status:** Accepted — 2026-09-14 (Phase 1 read)  
**Depends:** `metron-v3/specs/domain/mcp-server.md` · `specs/domain/metron-capability.md`  
**Knowledge:** `knowledge/metron-mcp-assistant.md` · `knowledge/paths.md` · `metron-v3/knowledge/mcp-server.md`

## Purpose

Wire METRON KPI/dashboard MCP tools into the Plexon free-chat orchestrator so operators can list projects, datasets, KPIs, and dashboards — and summarize boards — without inventing analytics facts.

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `METRON_MCP_URL` | plexon-v3 Coolify | Public FQDN of `metron-mcp` (prefer over internal hostname across projects) |

Helper: `getMetronMcpUrl()` in `lib/constants.ts`.

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
| `metron_dashboards` | `^metron_dashboard` |

Planner intent `metron_analytics` when prompt matches KPI/dashboard/metron patterns and `hasMetronMcp`.

## Orchestrator

MCP fetch branch beside Videon using `fetchCheckionMcpTools` against `getMetronMcpUrl()`.
