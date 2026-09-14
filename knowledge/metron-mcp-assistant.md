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
| `METRON_MCP_URL` | Set after Coolify `metron-mcp` is live |

## Smoke

Ask in assistant (from Metron or Plexon shell): “Welche Dashboards habe ich?” → tools `metron_dashboards_list` / `metron_dashboard_summarize`.
