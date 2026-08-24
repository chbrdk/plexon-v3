# Assistant ↔ SPIRION MCP

**Status:** Accepted — 2026-08-24 (Welle 1)  
**Depends:** SPIRION / DIG MCP at dig-api (`POST …/mcp`) · `specs/domain/collection-projects.md`  
**Knowledge:** `knowledge/paths.md` · `knowledge/coolify-plexon-v3-env-cheatsheet.md` §4e · `knowledge/spirion-mcp-assistant.md`

## Purpose

Wire live SPIRION design-reference MCP tools into the Plexon free-chat orchestrator so Creation scene builds and design research can pull real-world screens/references (not invented patterns).

## Env

| Key | Where | Notes |
|-----|--------|-------|
| `SPIRION_MCP_URL` | plexon-v3 Coolify | Staging: `https://spirion-api.projects-a.plygrnd.tech/mcp` (same dig-api app) |
| `DIG_MCP_URL` | legacy fallback | Accepted one release if `SPIRION_MCP_URL` unset |

Helper: `getSpirionMcpUrl()` in `lib/constants.ts`.

## Entitlement / host product

`useSpirionMcp` via `resolveUseSpirionMcp` / `resolveUseProductMcp` when MCP URL is set **and** any of:

1. product entitlement `spirion` `active`, or
2. `pageContext.product` is `spirion` **or** another platform shell (`plexon` / sibling including `creation`), or
3. any sibling product entitlement is `active`

Connectivity: `buildSpirionIntegrationContextBlock`.

## Tool families (read-only Welle 1)

| Family | Anthropic name patterns |
|--------|-------------------------|
| `spirion_references` | `^spirion_references_search$`, `^spirion_reference_(get|pack)$`, `^spirion_compose_brief$`, `^dig_(search|inspect|neighbors|compare|recommend)$`, `^dig_reference_` |
| `spirion_screens` | `^spirion_screens_search$`, `^spirion_capture_prompt_pack$`, `^spirion_flows_`, `^spirion_flow_`, `^dig_screen_`, `^dig_capture_`, `^dig_flow_` |

Write/job tools (`job_start`, `generate`, enrichment writes) are **not** in these families — Welle 1 is research only.

Include both families in `READ_ONLY_QA_FAMILIES` and `KNOWLEDGE_QA_FAMILIES`.

## Planner

| Intent | When | Families |
|--------|------|----------|
| `spirion_research` | Explicit SPIRION / DIG / Referenz / Screen-Search prompts | `spirion_references`, `spirion_screens`, `plexon_ui` |
| `creation_scene_edit` | Layout build (when Spirion MCP on) | existing Creation families **+** `spirion_references`, `spirion_screens` |

Heuristic `spirion_research`: spirion|dig\b|design.?intelligence|referenz|screen.?search|moodboard|pattern.?library and `hasSpirionMcp`.

### Latency

- `resolveMcpFlagsForPlan`: for `creation_scene_edit` / `creation_design` contact Creation **and** Spirion (when flagged). For `spirion_research` only Spirion.
- Do not fan out Checkion/Audion/Echon/Brandion on those intents.

## Creation loop guidance

On PDP/landing builds with Spirion active: optionally `spirion_references_search` / `spirion_screens_search` for **structure/copy inspiration**, then build scene, then `creation_scene_content_audit` / `creation_scene_preview` before claiming done.

### Tokens vs Literals (Spirion → Creation)

Spirion is **not** a complete token library for the Collection. WENN der Agent eine Spirion-Referenz umsetzt:

1. Spirion = Struktur, Hierarchie, Copy-Muster — **kein** 1:1 Pixel-/Farb-/Token-Clone der Fremdmarke.
2. **Freies Styling first-class:** Farben/Abstände/Radii via `set_prop` Literale (`#hex`, rem, px) auf Keys wie `background`/`color`/`gap`/`radius` — **ohne** neue Tokens anzulegen. Bei vorhandenem Binding zusätzlich `clear_token_binding`. Paint: Props überschreiben Token-Resolve.
3. Optional: `creation_brand_tokens_get` + `set_token_binding`, wenn der Pack den Intent trifft und wiederverwendbar sein soll.
4. `set_style` nur für `width`/`height` (Zahlen).
5. Collection-Pack vor Fremdmarken-Clone, wenn Pack genutzt wird — sonst bewusste Literale.
6. Nicht blockieren oder nur Site-Kit-Fixture belassen.

## Non-goals (Welle 1)

- Capture/job write tools / confirmation flows
- Capability executors beyond MCP tool loop
- Scene pixel preview (Welle 2 — `scene_preview`)

## Acceptance

1. Unit: catalog classifies `spirion_references_search` → `spirion_references`, `spirion_screens_search` → `spirion_screens`.
2. Gate: `resolveUseSpirionMcp` mirrors Brandion/Creation rules; host `creation` enables Spirion when URL set.
3. Planner: `creation_scene_edit` includes Spirion families when `hasSpirionMcp`; research prompts → `spirion_research`.
4. Staging: set `SPIRION_MCP_URL` on plexon-v3 Coolify.
