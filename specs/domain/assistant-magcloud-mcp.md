# Assistant ↔ MAGCLOUD MCP

**Status:** Accepted — 2026-10-01 (Wave 1 boards/search/ingest read)  
**Depends:** `magcloud/specs/domain/mcp-server.md` · `specs/domain/magcloud-capability.md`  
**Knowledge:** `knowledge/magcloud-mcp-assistant.md` · `knowledge/paths.md` · `magcloud/knowledge/mcp-server.md`

## Purpose

Wire Magcloud board/slide/ingest MCP tools into the Plexon free-chat orchestrator so operators can list boards, summarize a deck, search slides (pgvector), and inspect ingest jobs — without inventing pitch content.

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `MAGCLOUD_MCP_URL` | plexon-v3 Coolify | Public FQDN of `magcloud-mcp` |

Helper: `getMagcloudMcpUrl()` in `lib/constants.ts`.

## Auth

1. `magcloud-mcp` holds `MAGCLOUD_WRITE_SECRET` or `PLEXON_SERVICE_SECRET` for `slides_search`.  
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
| `magcloud_boards` | `^magcloud_boards_` · `^magcloud_board_(get\|summarize)$` |
| `magcloud_slides` | `^magcloud_slides_search$` |
| `magcloud_ingest` | `^magcloud_ingest_jobs_` · `^magcloud_ingest_job_get$` |

Planner intent `magcloud_pitch` when prompt matches Magcloud / pitch board / Folien-Suche and `hasMagcloudMcp`.

## Orchestrator

MCP fetch branch beside Metron using `fetchCheckionMcpTools` against `getMagcloudMcpUrl()`.

## Staging smoke

1. Coolify `magcloud-mcp` healthy  
2. Plexon `MAGCLOUD_MCP_URL` set  
3. Free-chat: „Welche Magcloud-Boards gibt es?“ → `magcloud_boards_list`
