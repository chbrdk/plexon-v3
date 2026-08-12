# Assistant ↔ CREATION MCP

**Status:** Accepted — 2026-08-12  
**Depends:** `creation-v3/specs/domain/mcp-server.md`  
**Knowledge:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/creation-v3-onboarding.md` · `knowledge/paths.md`

## Purpose

Wire CREATION library / composition / project MCP tools into the Plexon free-chat orchestrator so design-system and CREATION Collection questions use live fixture/catalog data (not invented tags).

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `CREATION_MCP_URL` | plexon-v3 Coolify | Prefer public FQDN across projects; internal `http://creation-mcp:3102` only when co-located |

Helper: `getCreationMcpUrl()` in `lib/constants.ts`.

## Entitlement / host product

`useCreationMcp` via `resolveUseCreationMcp` / `resolveUseProductMcp` when `CREATION_MCP_URL` is set **and** any of:

1. matching product entitlement `creation` `active`, or
2. `pageContext.product` is `creation` **or** another platform shell (`plexon` / sibling), or
3. any sibling product entitlement is `active`

Connectivity: `buildCreationIntegrationContextBlock`.

## Tool families

| Family | Anthropic name patterns |
|--------|-------------------------|
| `creation_library` | `^creation_health$`, `^creation_library_` |
| `creation_compositions` | `^creation_compositions_` |
| `creation_projects` | `^creation_projects_`, `^creation_project_` |

All read-only in v1. Include in `READ_ONLY_QA_FAMILIES` and `KNOWLEDGE_QA_FAMILIES`.

## Planner

Heuristic intent `creation_design` when prompt matches Composition|Library|Zaoly|CREATION|Web.?Component|`ds-`|contract catalog and `hasCreationMcp`.

## Non-goals

- Write tools / editor launch via MCP
- Live CEM / Host ops
- Auto UI cards (v1 text JSON is enough)

## Acceptance

1. Unit: catalog classifies `creation_library_catalog` → `creation_library`.
2. Gate: `resolveUseCreationMcp` mirrors Brandion rules.
3. Staging: set `CREATION_MCP_URL` after Coolify `creation-mcp` is live.
