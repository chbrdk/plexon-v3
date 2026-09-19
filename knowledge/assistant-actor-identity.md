# Assistant actor identity

**Spec:** `specs/domain/assistant-actor-identity.md`  
**Pattern:** VIDEON MCP (`specs/domain/assistant-videon-mcp.md`) — machine auth + session actor.

## Why lists looked like “admin only”

Plexon chat session = signed-in user. CHECKION/AUDION MCP + RAG called Products with Coolify `*_API_TOKEN`. Products treated the **token owner** as viewer → Access Model B for that owner (often admin).

## Fix

| Layer | Behavior |
|-------|----------|
| Plexon orchestrator | Inject `actorUserId` = session user into checkion/audion/brandion tools |
| Product MCP | Forward `X-Plexon-User-Id` (+ prefer `X-Service-Secret` when set) |
| Product `getRequestUser` | Env machine Bearer or service secret → viewer = actor header (fail closed) |
| Personal Settings Bearer | Still token owner (Cursor without actor) |

## Related

- Collection Team consumers: `knowledge/collection-team-ecosystem.md`
- Paths: machine tokens stay in Coolify env; no per-user redeploy
- Staging two-user smoke: `knowledge/assistant-access-model-b-smoke.md`
- Canonical AUDION assistant API: `AUDION_API_URL=https://audion-v3.projects-a.plygrnd.tech/api` (not FastAPI)
