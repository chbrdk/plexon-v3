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
- Scene insert contract (do not invent aliases): `insert_child` `{ parentId, child: { id, type, name?, props? } }` or `insert_instance` `{ masterId, parentId, index? }`. Forbidden: `insert_node`, `add_instance`, `append_child`. On `400 op-rejected` use the server `reason`; on `409 stale-scene` reload tree `updatedAt` as `baseUpdatedAt`.
- **New page / artboard:** When the user asks for a new page (Seite, PDP, Pricing, Contact, …), first `add_page` `{ name? }` (activates the new page), then re-read tree/`updatedAt` and insert under the new `scene.root.id`. Also allowed: `rename_page`, `duplicate_page`, `set_active_page`, `delete_page`, `move_node_to_page`. Do not satisfy “neue Seite” by only stacking nodes on the current page.

## Planner

| Intent | When | Families |
|--------|------|----------|
| `creation_design` | Library / catalog / Zaoly / WC tags | `creation_library`, `creation_compositions`, `creation_projects` |
| `creation_scene_edit` | Scene / layout / editor / Site Kit master prompts | `creation_scene`, `creation_scene_write` (write gated); plus `brandion_tokens` when Brandion MCP is on |

Heuristic: `creation_scene_edit` when prompt matches scene|layout|editor|hero|landing|site kit|master and `hasCreationMcp`, **or** when CREATION editor page context has an open composition scene.

### Latency

- `resolveMcpFlagsForPlan`: for `creation_scene_edit` / `creation_design` contact CREATION MCP (skip Checkion/Audion/Echon). Also contact **Brandion** when `useBrandionMcp` (active-pack / `brandion_tokens_*` for Collection identity). When `useSpirionMcp`, also contact Spirion for reference/screen inspiration (see `assistant-spirion-mcp.md`).
- Prefetch: editor turns load a compact scene-tree **outline** into the system prompt before the first LLM round.
- Orchestrator compacts `creation_scene_tree_index` results to the same outline format.
- MCP `tools/list` is cached ~60s per base URL; product MCP fetches run in parallel when multiple are enabled.
- Before finishing PDP/landing builds: call `creation_scene_content_audit` and fix error findings (Welle 1 self-check).

### Creative depth (`creation_scene_edit` only)

Layout/build turns need more room than Checkion/Audion Q&A. **Only** when planner intent is `creation_scene_edit`:

| Lever | Default | Env override | Other intents |
|-------|---------|--------------|---------------|
| `maxToolRounds` | **12** | `ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS` (1–16) | unchanged (typ. 4–6, LLM refine cap 8) |
| Extended thinking budget | **max(base, 8192)** | `ANTHROPIC_CREATION_SCENE_THINKING_BUDGET` | base only (`ANTHROPIC_ASSISTANT_THINKING_BUDGET`, default 4096) |
| System prompt | phased craft + **forbid seed copy**; prefer `insert_child`+props; **free literals via `set_prop`** (Hex/gap/radius) + optional `set_token_binding`; anti-wireframe Vision | — | no craft block |

- WENN `ANTHROPIC_ASSISTANT_THINKING_BUDGET` global `0`/`off` ist, DANN bleibt Thinking auch für Scene-Edit aus.
- LLM planner refine MUST NOT shrink `maxToolRounds` below the Creation depth default when intent stays `creation_scene_edit`.
- `creation_design` (library/catalog Q&A) does **not** get this budget — only scene/layout editing.
- Content-complete: Agents MUST set real `props` on inserts. Bare `insert_instance` (Master seeds: „Get started“, „Option A“, „Text“) is **not** a finished page — override via `props` on the op or `set_prop`.
- **Freies Styling (first-class):** Farben/Abstände/Radii wie im Inspector — `set_prop` mit Literal (`background`/`color`/`borderColor`/`gap`/`radius`/`fontSize`/… → Hex, rem, px). Bestehendes Token auf dem Key → `clear_token_binding`. Paint: Props überschreiben Token-Resolve (`resolveNodePaintStyle`). **Kein** neues Brandion-Token nötig. `set_token_binding` optional wenn Pack passt. `set_style` nur `width`/`height`. Optional `creation_brand_tokens_get` — nicht blockierend. Spirion = Inspiration only (see `assistant-spirion-mcp.md`).
- After audit: `creation_scene_preview` for Vision (Welle 2; max 2 rounds). Vision MUST fail gray wireframe / tiny placeholder images / untouched Site Kit fixture chrome.

## Non-goals

- Live CEM / Host ops
- Auto UI cards (v1 text JSON is enough)
- Collection entitlement enforcement for service writes (phase 2 — logged in CREATION audit only)

## Acceptance

1. Unit: catalog classifies `creation_scene_tree_index` → `creation_scene`, `creation_scene_apply_ops` → `creation_scene_write`.
2. Gate: `resolveUseCreationMcp` mirrors Brandion rules.
3. Planner: layout prompts → `creation_scene_edit` with write tools only when user asks to change/build.
4. Staging: set `CREATION_MCP_URL` after Coolify `creation-mcp` is live.
5. Unit: `creation_scene_edit` plans ≥12 tool rounds; thinking budget for that intent is ≥8192 when base thinking is on; Checkion/other intents keep default rounds/budget.
