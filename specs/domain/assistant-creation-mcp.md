# Assistant ↔ CREATION MCP

**Status:** Accepted — 2026-08-12 · **P90 scene write** 2026-08-23  
**Depends:** `creation-v3/specs/domain/mcp-server.md` · `creation-v3/specs/domain/scene-agent-editing.md`  
**Knowledge:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/creation-v3-onboarding.md` · `knowledge/paths.md` · `creation-v3/knowledge/scene-agent-site-kit-recipe.md`

## Purpose

Wire CREATION library / composition / project / **scene agent** MCP tools into the Plexon free-chat orchestrator so design-system, layout-editing, and CREATION Collection questions use live data (not invented tags).

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
| `creation_scene` | `^creation_scene_(get|list|tree_index)$`, `^creation_editor_palette$`, `^creation_brand_tokens_get$` |
| `creation_scene_write` | `^creation_scene_apply_ops$`, `^creation_site_kit_composition_save$` |

- v1 read families (`creation_library`, `creation_compositions`, `creation_projects`) remain read-only in Q&A.
- `creation_scene` is read-only; include in `READ_ONLY_QA_FAMILIES` and `KNOWLEDGE_QA_FAMILIES`.
- `creation_scene_write` requires explicit user write intent (`allowWriteTools`) — detected via `hasSceneWriteIntent` (einfügen/ändern/bauen/…) or editor-context confirm; user confirmation per orchestrator policy for destructive ops.

## Planner

| Intent | When | Families |
|--------|------|----------|
| `creation_design` | Library / catalog / Zaoly / WC tags | `creation_library`, `creation_compositions`, `creation_projects` |
| `creation_scene_edit` | Scene / layout / editor / Site Kit master prompts | `creation_scene`, `creation_scene_write` (write gated) |

Heuristic: `creation_scene_edit` when prompt matches scene|layout|editor|hero|landing|site kit|master and `hasCreationMcp`.

## Non-goals

- Live CEM / Host ops
- Auto UI cards (v1 text JSON is enough)
- Collection entitlement enforcement for service writes (phase 2 — logged in CREATION audit only)

## Acceptance

1. Unit: catalog classifies `creation_scene_tree_index` → `creation_scene`, `creation_scene_apply_ops` → `creation_scene_write`.
2. Gate: `resolveUseCreationMcp` mirrors Brandion rules.
3. Planner: layout prompts → `creation_scene_edit` with write tools only when user asks to change/build.
4. Staging: set `CREATION_MCP_URL` after Coolify `creation-mcp` is live.
