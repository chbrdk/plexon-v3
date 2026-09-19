# Assistant actor identity

**Spec:** `specs/domain/assistant-actor-identity.md`  
**Pattern:** VIDEON MCP (`specs/domain/assistant-videon-mcp.md`) — machine auth + session actor.

## Why lists looked like “admin only”

Plexon chat session = signed-in user. CHECKION/AUDION MCP + RAG called Products with Coolify `*_API_TOKEN`. Products treated the **token owner** as viewer → Access Model B for that owner (often admin).

## Fix

| Layer | Behavior |
|-------|----------|
| Plexon orchestrator | Inject `actorUserId` = session user into checkion/audion/brandion tools |
| Product MCP | Forward `X-Plexon-User-Id` (+ prefer `X-Service-Secret` when set); **require actor** for machine auth |
| Product `getRequestUser` | Env machine Bearer or service secret → viewer = actor header (fail closed) |
| Brandion guideline ACL | `service_secret` without actor → 401 on list/mutate; with actor → Model B |
| Knowledge pack HTTP | Service secret + actor + `userCanViewPlatformProject` (no secret-only dump) |
| Personal Settings Bearer | Still token owner (Cursor without actor) |

## Hardening backlog (2026-09-19)

| # | Item | Status |
|---|------|--------|
| 1 | Audion Next TG/RAG Model B | Done (`audion-v3` `eee3e18`) |
| 2 | Staging two-user smoke checklist | Done (`knowledge/assistant-access-model-b-smoke.md`) |
| 3 | Machine token without actor fail-closed + no Brandion ACL bypass | Done (this wave) |
| 4 | Plexon Admin bypass (Assistant-only strict Model B) | Open (product decision) |
| 5 | Audion MCP (AUDION-v2) forward actor | Done (actor store + header) |
| 6 | Knowledge pack / internal stores gate | Done (`authorizeKnowledgeRead`) |

## Related

- Collection Team consumers: `knowledge/collection-team-ecosystem.md`
- Paths: machine tokens stay in Coolify env; no per-user redeploy
- Staging two-user smoke: `knowledge/assistant-access-model-b-smoke.md`
- Canonical AUDION assistant API: `AUDION_API_URL=https://audion-v3.projects-a.plygrnd.tech/api` (not FastAPI)
