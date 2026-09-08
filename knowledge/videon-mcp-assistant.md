# VIDEON MCP ↔ Plexon assistant

**Status:** Draft — 2026-09-08  
**Spec:** `specs/domain/assistant-videon-mcp.md`  
**Product MCP:** `videon-v3/specs/domain/mcp-server.md`

## Summary

VIDEON Phase 1+2 is wired into the free-chat orchestrator. Auth matches CREATION:

1. Coolify `videon-mcp` + `VIDEON_MCP_URL` on Plexon  
2. MCP uses `PLEXON_SERVICE_SECRET`; Plexon injects `actorUserId` on every `videon_*` tool call  
3. Product resolves actor via service secret + `X-Plexon-User-Id`, then Access Model B  

Federation remains for provisioning/summary; MCP for agent tools. Settings API tokens are optional for Cursor only.

After `videon_media_search`, Plexon auto-emits `video_hit_strip` (scene cards + poster proxy) — see `assistant-videon-mcp.md`.
