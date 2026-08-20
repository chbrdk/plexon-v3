# Assistant ↔ ECHON MCP

**Status:** Accepted — 2026-08-20  
**Depends:** `echon-v3/v3/specs/domain/mcp-server.md` · `mcp-tool-inventory.md`  
**Knowledge:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/echon-mcp-integration.md` · `knowledge/paths.md`

## Purpose

Wire ECHON market-intelligence MCP tools into the Plexon free-chat orchestrator so signal / wave / foresight / research questions use live ECHON v3 data.

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `ECHON_MCP_URL` | plexon-v3 Coolify | Prefer public FQDN of `echon-mcp`; internal `http://echon-mcp:3101` only when co-located |

Helper: `getEchonMcpUrl()` in `lib/constants.ts`.

## Entitlement / host product

`useEchonMcp` via `resolveUseEchonMcp` / `resolveUseProductMcp` when `ECHON_MCP_URL` is set **and** any of:

1. matching product entitlement `echon` `active`, or
2. `pageContext.product` is `echon` **or** another platform shell (`plexon` / sibling including `echon`), or
3. any sibling product entitlement is `active`

Do **not** gate ECHON MCP only on Checkion/Audion entitlements.

Connectivity: extend ECHON block in `echon-connectivity` / integration context.

## Tool families

| Family | Anthropic name patterns |
|--------|-------------------------|
| `echon_ops` | `^echon_health$`, `^echon_pipeline_`, `^echon_workers_` |
| `echon_signals` | `^echon_signals?_`, `^echon_signal_` |
| `echon_waves` | `^echon_waves?_`, `^echon_wave_` |
| `echon_foresight` | `^echon_foresight_` |
| `echon_research` | `^echon_research` |
| `echon_corpus` | `^echon_sources_`, `^echon_industries_` |

Include read families in `READ_ONLY_QA_FAMILIES`. Write tools require confirmation (`research_run_start`, ingest, waves_detect).

## Planner

Heuristic intent `echon_market` when prompt matches Signal|Wave|Foresight|Markt|ECHON|Briefing|momentum and `hasEchonMcp`.

## Embed product

`AssistantEmbedProduct` and page-context parsers MUST accept `echon` so FAB hosts can pass `product=echon`.

## Non-goals

- Auto UI cards per tool (text JSON)
- Knowledge-pack sync / provisioning

## Acceptance

1. Unit: catalog classifies `echon_foresight_momentum` → `echon_foresight`.
2. Gate: `resolveUseEchonMcp` mirrors Creation rules with product `echon`.
3. Staging: set `ECHON_MCP_URL` after Coolify `echon-mcp` is live.
