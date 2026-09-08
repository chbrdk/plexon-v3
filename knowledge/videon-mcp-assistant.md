# VIDEON MCP ↔ Plexon assistant

**Status:** Draft — 2026-09-08  
**Spec:** `specs/domain/assistant-videon-mcp.md`  
**Product MCP:** `videon-v3/specs/domain/mcp-server.md`

## Summary

VIDEON is not yet wired into the free-chat orchestrator. Target pattern matches Brandion/Echon:

1. Coolify `videon-mcp` → set `VIDEON_MCP_URL` on Plexon  
2. `getVideonMcpUrl()` + `resolveUseVideonMcp` + `videon_*` families in `tool-catalog.ts`  
3. Fetch branch in `orchestrator-complete.ts`  
4. Planner intent `videon_media` for scene/video/cut/analysis questions  

Federation remains for provisioning/summary; MCP for agent tools.
