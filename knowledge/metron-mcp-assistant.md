# METRON MCP ↔ Plexon assistant

**Status:** Accepted — 2026-09-14 (Phase 1)  
**Spec:** `specs/domain/assistant-metron-mcp.md`  
**Product MCP:** `metron-v3/specs/domain/mcp-server.md`

## Summary

1. Coolify `metron-mcp` + `METRON_MCP_URL` on Plexon  
2. MCP uses `PLEXON_SERVICE_SECRET`; Plexon injects `actorUserId` on every `metron_*` tool (except health)  
3. Optional `platformProjectId` injection for list tools when Embed context has a Collection  

## Env

| Key | Notes |
|-----|--------|
| `METRON_MCP_URL` | Set after Coolify `metron-mcp` is live — staging `https://hh0pad7nwoupxnydpd7shb9r.projects-a.plygrnd.tech` |

## Smoke

Ask in assistant (from Metron or Plexon shell): “Welche Dashboards habe ich?” → `metron_dashboards_list` → `link_list`.  
“Summarize dashboard X” / get → `metric_grid` + optional `chart` + deep link (`UiMetricGrid` / `UiChartBlock`).  
“Was ist der Wert von KPI X?” → `metron_kpi_evaluate` / `metron_kpi_summarize` → Metric-Grid (Server-SSOT).  
On Metron `/dashboards/:id`: entity inject — summarize without pasting the id.  
**Share** on that turn → clipboard `/share/metron/mtn_…` (public read-only). Spec: `specs/domain/assistant-metron-share.md`.

Wave 3 tools: `dataset_get` · `kpi_get` · `kpi_evaluate` · `kpi_summarize`.  
Wave 4: multi-chart Auto-UI (`dashboard_get`); confirm-write `kpi_create`; chat playbook Suite sync → `checkion-site-health` → Overview Board (follow-ups, no auto-create).
