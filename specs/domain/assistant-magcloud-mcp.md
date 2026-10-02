# Assistant ↔ MAGCLOUD MCP

**Status:** Accepted — 2026-10-02 (Wave 2: local ingest + meta-conflict resolve + Auto-UI)  
**Depends:** `magcloud/specs/domain/mcp-server.md` · `specs/domain/magcloud-capability.md`  
**Knowledge:** `knowledge/magcloud-mcp-assistant.md` · `knowledge/paths.md` · `magcloud/knowledge/mcp-server.md`

## Purpose

Wire Magcloud board/slide/ingest MCP tools into the Plexon free-chat orchestrator so operators can list boards, summarize a deck, search slides (pgvector), inspect ingest jobs, start **local** PPTX ingest, and resolve meta conflicts — without inventing pitch content. SharePoint remains out until Graph secrets land.

## Env

| Key | Where | Notes |
|-----|--------|-------|
| `MAGCLOUD_MCP_URL` | plexon-v3 Coolify | Public FQDN of `magcloud-mcp` |

Helper: `getMagcloudMcpUrl()` in `lib/constants.ts`.

## Auth

1. `magcloud-mcp` holds `MAGCLOUD_WRITE_SECRET` or `PLEXON_SERVICE_SECRET` for search/ingest/resolve.  
2. Orchestrator may inject session `actorUserId` into tool args (`injectMagcloudToolArgs`).  
3. MCP → Universe: `X-Service-Secret` / `X-Magcloud-Write-Secret` when needed.

## Entitlement / host product

`useMagcloudMcp` via `resolveUseMagcloudMcp` / `resolveUseProductMcp` when `MAGCLOUD_MCP_URL` is set **and** any of:

1. product entitlement `magcloud` is `active`, or  
2. `pageContext.product` is `magcloud` **or** another platform shell, or  
3. any sibling product entitlement is `active`

Connectivity block: `buildMagcloudIntegrationContextBlock`.

## Tool families

| Family | Anthropic name patterns |
|--------|-------------------------|
| `magcloud_ops` | `^magcloud_health$` · `^magcloud_ingest_health$` |
| `magcloud_boards` | `^magcloud_boards_` · `^magcloud_board_(get\|summarize)$` · `^magcloud_meta_conflicts_list$` |
| `magcloud_slides` | `^magcloud_slides_search$` |
| `magcloud_ingest` | `^magcloud_ingest_jobs_` · `^magcloud_ingest_job_get$` |
| `magcloud_write` | `^magcloud_ingest_start$` · `^magcloud_meta_conflict_resolve$` |

Planner intent `magcloud_pitch` when prompt matches Magcloud / pitch board / Folien-Suche and `hasMagcloudMcp`.  
Write prompts (`ingest` / `resolve` / `Konflikt`) set `allowWriteTools` and include `magcloud_write`.

## Confirm gate

`WRITE_CONFIRM_TOOL_PATTERNS` includes:

- `magcloud_ingest_start`
- `magcloud_meta_conflict_resolve`

## Auto-UI

After tool success, orchestrator appends blocks (`lib/assistant/ui-blocks/build-magcloud-board-ui.ts`):

| Tool | Blocks |
|------|--------|
| `magcloud_boards_list` | `link_list` (board → Magcloud `/boards?boardId=`) |
| `magcloud_board_summarize` | `metric_grid` + `link_list` |
| `magcloud_slides_search` | `link_list` (hit titles + score) |
| `magcloud_ingest_jobs_list` / `ingest_job_get` | `step_list` (+ `metric_grid` on ready sync) |
| `magcloud_meta_conflicts_list` | `key_value_list` (open conflicts) |
| `magcloud_meta_conflict_resolve` | `alert` + remaining count |

## Orchestrator

MCP fetch branch beside Metron using `fetchCheckionMcpTools` against `getMagcloudMcpUrl()`.

## Staging smoke

1. Coolify `magcloud-mcp` healthy  
2. Plexon `MAGCLOUD_MCP_URL` set  
3. Free-chat: „Welche Magcloud-Boards gibt es?“ → `magcloud_boards_list` + `link_list`  
4. „Offene Meta-Konflikte auf Magenta_Pitch…“ → `meta_conflicts_list`  
5. Resolve only after Confirm UI
