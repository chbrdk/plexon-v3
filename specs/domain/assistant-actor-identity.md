# Assistant actor identity (Access Model B)

**Status:** Accepted — 2026-09-19  
**Depends:** `assistant-videon-mcp.md` · `access-model-b-project-visibility.md` · product `settings-api-tokens.md`  
**Knowledge:** `knowledge/assistant-actor-identity.md`

## Purpose

Every free-chat completion runs as the **signed-in Plexon user**. Product MCP/REST must not treat Coolify `*_API_TOKEN` owners as the viewer.

## Auth triad (required)

1. **Machine credential** — `PLEXON_SERVICE_SECRET` and/or env `CHECKION_API_TOKEN` / `AUDION_API_TOKEN` / `BRANDION_API_TOKEN` (not a user identity).  
2. **Actor** — session `user.id` injected as tool arg `actorUserId` and/or header `X-Plexon-User-Id`.  
3. **ACL** — Product resolves viewer from actor, then Access Model B (`accessible-collections` / assignments / creator).

## Product rule

WHEN Authorization Bearer equals the Coolify env machine token  
OR WHEN `X-Service-Secret` matches `PLEXON_SERVICE_SECRET`  
THEN viewer MUST be `X-Plexon-User-Id` (fail closed if missing).

WHEN Bearer is a **personal** Settings token (hash lookup, not env equality)  
THEN viewer MAY remain the token owner (Cursor / CLI without actor).

## Orchestrator

`injectAssistantMcpToolArgs` MUST force session `actorUserId` on `checkion_*` / `audion_*` / `brandion_*` tools (except `health`), same as `injectVideonToolArgs` / `injectMetronToolArgs`.

RAG / project-context REST already send `X-Plexon-User-Id` with the machine Bearer — Products MUST honor it under the machine-token rule above.

## Non-goals

- Minting per-user API tokens for chat  
- Rotating Coolify secrets per user  
- Opening company-wide Collection visibility
