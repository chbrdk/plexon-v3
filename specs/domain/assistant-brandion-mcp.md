# Assistant ↔ Brandion MCP

**Status:** Accepted — 2026-08-11  
**Depends:** `brandion-v3/specs/domain/mcp-server.md`  
**Knowledge:** `knowledge/plexon-assistant-orchestrator.md` · `knowledge/coolify-env-variablen.md` · `knowledge/paths.md`

## Purpose

Wire Brandion guideline/token MCP tools into the Plexon free-chat orchestrator so brand/color questions can be answered from live BRANDION data (not invented).

## Env

| Key | Where | Notes |
|-----|--------|--------|
| `BRANDION_MCP_URL` | plexon-v3 Coolify | Prefer internal `http://brandion-mcp:3100` |

Helper: `getBrandionMcpUrl()` in `lib/constants.ts`.

## Entitlement

`useBrandionMcp` when `entitlements.brandion.status === active` (same gate pattern as Checkion/Audion). Tools only load when URL is set.

## Tool families

| Family | Anthropic name patterns |
|--------|-------------------------|
| `brandion_guidelines` | `^brandion_guidelines_`, `^brandion_guideline_`, `^brandion_health$` |
| `brandion_tokens` | `^brandion_tokens_` |

Both are read-only in v1. Include in `READ_ONLY_QA_FAMILIES` and `KNOWLEDGE_QA_FAMILIES`.

## Planner

Heuristic intent `brandion_brand` (or route via `project_knowledge` with brandion families) when prompt matches Farbe|Farben|color|colours?|Guideline|Marke|Brandion|Design.?Token|CD\b|Corporate.?Design and `hasBrandionMcp`.

Prefer `brandion_tokens` + `brandion_guidelines` + `plexon_ui` (optional swatch/kv blocks).

## Orchestrator

Fourth MCP fetch branch beside Checkion / Audion / Echon using shared `fetchCheckionMcpTools` client.

## Non-goals

- Write tools / confirmation flows
- Dumping full token graphs into system prompt
- Treating `@msqdx/ui-tokens` as Brandion guideline truth

## Acceptance

1. Unit: catalog classifies `brandion_tokens_list` → `brandion_tokens`.
2. Planner: color prompt with `hasBrandionMcp` selects brandion families.
3. Staging: `BRANDION_MCP_URL` set; assistant answers guideline colors via tools.
