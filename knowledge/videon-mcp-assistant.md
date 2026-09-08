# VIDEON MCP ↔ Plexon assistant

**Status:** Accepted — 2026-09-08 (feature waves)  
**Spec:** `specs/domain/assistant-videon-mcp.md` · `assistant-videon-hit-chrome.md`  
**Product MCP:** `videon-v3/specs/domain/mcp-server.md` · `scene-hit-model.md`

## Summary

VIDEON Phase 1+2 is wired into the free-chat orchestrator. Auth matches CREATION:

1. Coolify `videon-mcp` + `VIDEON_MCP_URL` on Plexon  
2. MCP uses `PLEXON_SERVICE_SECRET`; Plexon injects `actorUserId` on every `videon_*` tool call  
3. When Embed/`pageContext.platformProjectId` is set, inject also scopes `media_search` unless the caller overrides  
4. Product resolves actor via service secret + `X-Plexon-User-Id`, then Access Model B  

Federation remains for provisioning/summary; MCP for agent tools. Settings API tokens are optional for Cursor only.

## Generative UI

| Trigger | Block |
|---------|--------|
| `videon_media_search` | `video_hit_strip` — scene cards, poster proxy, optional filmstrip/preview, card actions |
| `videon_media_get` / `videon_analysis_get` | compact status card (lifecycle + deep links) |

Proxies (same-origin, Model B):

- `GET /api/assistant/videon-frame` → VIDEON `/api/media/:id/frame` (cached JPEG)  
- `GET /api/assistant/videon-preview` → VIDEON `/api/media/:id/preview` (≤3s muted MP4)

Write actions on hit cards require confirm / `allowWriteTools`. Knowledge facet `media_insights` is registered for VIDEON publish + Assistant cite.
