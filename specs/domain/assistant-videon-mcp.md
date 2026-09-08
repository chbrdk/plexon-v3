# Assistant ↔ VIDEON MCP

**Status:** Draft — 2026-09-08  
**Depends:** `videon-v3/specs/domain/mcp-server.md` · `specs/domain/videon-integration.md` · `specs/api/videon-federation.md`  
**Knowledge:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/videon-mcp-assistant.md` · `knowledge/paths.md`

## Purpose

Wire VIDEON media/scene/analysis/cut MCP tools into the Plexon free-chat orchestrator so operators can find scenes, check analysis status, and open deep-linked editor moments from Collection chat — without inventing media facts.

Federation (provisioning, Access Model B projection, summary card) stays separate; MCP is the **agent** surface over the Product API.

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `VIDEON_MCP_URL` | plexon-v3 Coolify | Public FQDN of `videon-mcp` or internal `http://videon-mcp:3103` when co-located |

Helper: `getVideonMcpUrl()` in `lib/constants.ts`.

## Entitlement / host product

`useVideonMcp` via `resolveUseVideonMcp` / `resolveUseProductMcp` when `VIDEON_MCP_URL` is set **and** any of:

1. product entitlement `videon` is `active`, or  
2. `pageContext.product` is `videon` **or** another platform shell (`plexon` / sibling Collection host), or  
3. any sibling product entitlement is `active`

Connectivity block: `buildVideonIntegrationContextBlock` so the model knows MCP is available and must use tools for scene/media claims.

## Tool families

| Family | Anthropic name patterns | Mode |
|--------|-------------------------|------|
| `videon_ops` | `^videon_health$` | read |
| `videon_projects` | `^videon_projects_` | read |
| `videon_media` | `^videon_media_` | read (P1) |
| `videon_analysis` | `^videon_analysis_` | read P1; write/job P2 |
| `videon_cuts` | `^videon_cuts?_`, `^videon_cut_` | read P1; write P2 |
| `videon_export` | `^videon_export_` | job / Flow-first (P2) |

Include `videon_ops`, `videon_projects`, `videon_media`, read `videon_analysis` / `videon_cuts` in `READ_ONLY_QA_FAMILIES` / platform assistant families as appropriate.

Write/job tools (`analysis_run`, `cut_create`, `export_run`, `brand_check_run`) require planner `allowWriteTools: true` and confirmation policy consistent with other products.

## Planner

Heuristic intent `videon_media` when prompt matches  
`(Szene|Scene|Video|Clip|Cut|Timeline|Mediathek|Library|Transcript|Analyse|Analysis|VIDEON|videon)`  
and `hasVideonMcp`.

- **Read (default):** `videon_media` + `videon_projects` + `videon_analysis` + `videon_cuts` (+ `videon_ops`).  
- **Write:** same + write families when create/run/export verbs appear.

`pageContext.platformProjectId` SHOULD be passed through tool args when present (search scope / detail).

## Orchestrator

Add a MCP fetch branch beside Brandion / Audion / Echon / … using the shared `fetchCheckionMcpTools` client against `getVideonMcpUrl()`.

Hook (optional, later): after successful `videon.media_search` / `videon_media_search`, auto-emit generative UI blocks (e.g. scene hit cards / strip) — **do not** block Phase 1 wiring on UI cards; text + deep links are enough.

## Capability catalog

Register progressive catalog entries (same ids as `videon-integration.md`) with `surfaces.agent` and MCP tool name mapping once Phase 1 tools exist:

| Capability | Agent tool(s) |
|------------|---------------|
| `videon.media.search` | `videon.media_search` |
| `videon.analysis.get` | `videon.analysis_get`, `videon.media_get` |
| `videon.analysis.run` | `videon.analysis_run` |
| `videon.cut.create` | `videon.cut_create` |
| `videon.export.run` | `videon.export_run` |

## Embed product

`AssistantEmbedProduct` / page-context parsers MUST accept `videon` so FAB hosts and Collection shells can pass `product=videon`.

## Non-goals

- Federation tool-calling instead of MCP  
- Shipping video binaries or signed playback URLs into chat  
- Replacing VIDEON’s own `/chat` retrieval UI  
- Auto-running exports without confirmation / Flow policy

## Acceptance

1. Unit: `tool-catalog` classifies `videon_media_search` → `videon_media`.  
2. Gate: `resolveUseVideonMcp` mirrors Brandion/Echon rules with product `videon`.  
3. Orchestrator loads tools when `VIDEON_MCP_URL` set and entitlement/host allows.  
4. Staging: after `videon-mcp` Coolify service is live, scene Q&A returns tool-backed hits with editor deep links (`t` / `scene`).
