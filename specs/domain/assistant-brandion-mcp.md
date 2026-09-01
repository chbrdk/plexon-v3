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

## Entitlement / host product

`useBrandionMcp` / `useAudionMcp` / `useCheckionMcp` via `resolveUseProductMcp` in `lib/assistant/product-mcp-gate.ts` when the product MCP URL is set **and** any of:

1. matching product entitlement `active`, or
2. `pageContext.product` is that product **or** another platform shell (`plexon` / sibling) — Collection cross-ask (e.g. Brandion embed → AUDION personas), or
3. any sibling product entitlement is `active`

Connectivity blocks: `buildBrandionIntegrationContextBlock` / Audion equivalent so the model knows MCP is on.

## Tool families

| Family | Anthropic name patterns |
|--------|-------------------------|
| `brandion_guidelines` | `^brandion_guidelines_`, `^brandion_guideline_`, `^brandion_health$`, `^brandion_projects?_`, `^brandion_export_`, `^brandion_rules?_`, `^brandion_analysis_` |
| `brandion_tokens` | `^brandion_tokens_`, `^brandion_token_upsert$` |

Read tools stay in `READ_ONLY_QA_FAMILIES` / `KNOWLEDGE_QA_FAMILIES`. Write tools are available on **any platform shell host** (Audion, Checkion, Brandion, Plexon, …) when the planner sets `allowWriteTools: true` (explicit create/update/import/upsert/delete/archive verbs in the user prompt).

## Planner

Heuristic intent `brandion_brand` when prompt matches Farbe|Farben|color|colours?|Guideline|Marke|Brandion|Design.?Token|CD|Corporate.?Design and `hasBrandionMcp`.

- **Read** (default): `brandion_tokens` + `brandion_guidelines` + generative Brandion cards.
- **Write** (`allowWriteTools: true`): same families + `brandion_guideline_create`, `brandion_token_upsert`, rules/import/analysis tools — triggered by write verbs (erstelle, anlegen, import, upsert, …). Works from any product FAB, not only Brandion UI.

Generic `general_chat` / `project_knowledge` / `action_write` intents use `PLATFORM_ASSISTANT_FAMILIES` when write intent is detected (cross-product parity).

## Content cards (generative UI)

After a successful `brandion.tokens_list` / `brandion_tokens_list`, the orchestrator **auto-emits** UI blocks via `buildBrandionTokenBlocks` (do not rely on the model to invent swatches).

| type | Props (summary) | Render |
|------|-----------------|--------|
| `color_swatch_grid` | `title?`, `guidelineName?`, `items: [{ label, hex, path? }]` | `@msqdx/ui` `ChatBlockPanel` + `SwatchStrip` + row swatches |
| `font_specimen_list` | `title?`, `items: [{ label, family, weight?, sample?, path? }]` | Specimen text with inline `font-family` (no webfont load) |
| `finding_list` | `items: [{ title, description, severity?, hex?, swatches? }]` | Finding rows with optional color swatch card — **prefer over `data_table` for Persona×Farbe** |

Limits: `maxColorSwatches: 24`, `maxFontSpecimens: 12` in `UI_BLOCK_LIMITS`.

Model guidance: when auto-cards are present, answer with short narrative — **do not** append a second full palette via `plexon_ui_append_block`. For color fits use `finding_list.hex` / `swatches`, never a color matrix table.

## Orchestrator

Fourth MCP fetch branch beside Checkion / Audion / Echon using shared `fetchCheckionMcpTools` client.  
Hook: after `tokens_list` tool result → parse JSON → append `color_swatch_grid` / `font_specimen_list` to `UiBlockAccumulator` + SSE `ui_block`.

## Non-goals

- Dumping full token graphs into system prompt
- Treating `@msqdx/ui-tokens` as Brandion guideline truth
- Loading remote webfonts into the chat specimen
- Settings API token CRUD via MCP

## Acceptance

1. Unit: catalog classifies `brandion_tokens_list` → `brandion_tokens`.
2. Planner: color prompt with `hasBrandionMcp` selects brandion families.
3. Unit: `buildBrandionTokenBlocks` maps MCP color/typography rows → validated blocks.
4. Staging: `BRANDION_MCP_URL` set; color Q&A shows swatch cards (not only markdown hex).
