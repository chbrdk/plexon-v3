# Assistant ↔ VIDEON MCP

**Status:** Accepted — 2026-09-08 (feature waves)  
**Depends:** `videon-v3/specs/domain/mcp-server.md` · `videon-v3/specs/domain/scene-hit-model.md` · `specs/domain/videon-integration.md` · `specs/api/videon-federation.md` · `assistant-videon-hit-chrome.md`  
**Knowledge:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/videon-mcp-assistant.md` · `knowledge/paths.md`

## Purpose

Wire VIDEON media/scene/analysis/cut MCP tools into the Plexon free-chat orchestrator so operators can find scenes, check analysis status, and open deep-linked editor moments from Collection chat — without inventing media facts.

Federation (provisioning, Access Model B projection, summary card) stays separate; MCP is the **agent** surface over the Product API.

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `VIDEON_MCP_URL` | plexon-v3 Coolify | Public FQDN of `videon-mcp` or internal `http://videon-mcp:3103` when co-located |

Helper: `getVideonMcpUrl()` in `lib/constants.ts`.

## Auth (per chat user)

Same pattern as CREATION:

1. `videon-mcp` holds `PLEXON_SERVICE_SECRET` (shared with Product).  
2. Orchestrator injects session `actorUserId` into every `videon_*` tool call except `health` (`injectVideonToolArgs`).  
3. MCP → Product: `X-Service-Secret` + `X-Plexon-User-Id` → Access Model B for **that** user.

Do **not** configure a fixed `VIDEON_API_TOKEN` / bootstrap owner for the assistant path.

## Scoped search (`platformProjectId`)

1. WHEN Embed / `pageContext.platformProjectId` (or orchestrator `platformProjectId`) is set THEN `injectVideonToolArgs` MUST set `platformProjectId` on `videon_media_search` / `videon.media_search` if the caller did not already supply a non-empty override.  
2. WHEN the user explicitly asks for all projects / global search AND the tool arg omits scope THEN search MAY remain Collection-unscoped (Model B across accessible workspaces).  
3. WHEN no page context project is set THEN inject MUST NOT invent a `platformProjectId`.

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

MCP fetch branch beside Brandion / Audion / Echon / … using `fetchCheckionMcpTools` against `getVideonMcpUrl()`.

### Auto UI after `videon_media_search`

WHEN `videon.media_search` / `videon_media_search` returns items THEN the orchestrator MUST auto-emit a generative UI block `video_hit_strip` (Brandion `tokens_list` pattern):

- Hit fields follow `videon-v3/specs/domain/scene-hit-model.md`  
- Absolute editor deep links via `getVideonUrl()` + MCP `href`  
- Optional `posterUrl` = same-origin `/api/assistant/videon-frame?…` (Plexon proxies VIDEON `GET /api/media/:id/frame` with service secret + session actor)  
- Optional filmstrip / muted preview per `assistant-videon-hit-chrome.md`  
- Organism: `UiVideoHitStrip` (`StepStrip` cards like VIDEON `/chat`)  
- Optional per-item `actions`: `open` | `analysis_run` | `brand_check_run` (see Card actions)

MCP payloads MUST NOT include thumbnails, video bytes, or signed playback URLs.

### Card actions

1. WHEN `video_hit_strip` items include `actions` THEN `UiVideoHitStrip` MUST render them.  
2. WHEN action `kind` is `open` THEN the UI MUST open the item `href` (new tab / same tab per shell).  
3. WHEN action `kind` is `analysis_run` or `brand_check_run` THEN the UI MUST NOT fire silently — it MUST use the existing assistant confirm / write enqueue path (`allowWriteTools` + confirmation policy) with `mediaAssetId`, `platformProjectId`, and session `actorUserId`.  
4. MCP tools remain unchanged; the UI triggers existing write tools after confirm.

### Auto UI after `videon_media_get` / `videon_analysis_get`

WHEN `videon_media_get` or `videon_analysis_get` succeeds THEN the orchestrator MUST auto-emit a compact status block (`video_status_card` or `key_value_list` + `step_list`): lifecycle / analysis stages + deep links — NOT a transcript dump.

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
4. `injectVideonToolArgs` forces session `actorUserId` on all `videon_*` tools except health; injects `platformProjectId` onto `media_search` when page context has one and the arg is empty.  
5. Auto-emit: successful `videon_media_search` appends `video_hit_strip` with absolute hrefs + poster proxy URLs + optional actions / filmstrip.  
6. Auto-emit: successful `media_get` / `analysis_get` appends status UI.  
7. Staging: scene Q&A shows hit cards scoped to the logged-in user’s Access Model B memberships.
