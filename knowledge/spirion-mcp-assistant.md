# SPIRION MCP ↔ Plexon Assistant

**Spec:** `specs/domain/assistant-spirion-mcp.md`  
**Coolify dig-api:** `spirion-api.projects-a.plygrnd.tech` · MCP `POST /mcp`

| Env | Staging value |
|-----|----------------|
| `SPIRION_MCP_URL` | `https://spirion-api.projects-a.plygrnd.tech/mcp` |
| `DIG_MCP_URL` | legacy fallback only |

Gate: `resolveUseSpirionMcp` — URL + entitlement / host product / sibling.

Read families: `spirion_references`, `spirion_screens` (includes `captures_list`, `capture_prompt_pack`, analyses; no job/generate writes in Welle 1).

## Creation quality path

1. `spirion_captures_list` (no project filter on staging)  
2. `spirion_capture_prompt_pack` → look_contract / page_rhythm  
3. optional `spirion_compose_brief`  
4. `creation_scene_import_html` implementing the pack  
5. Editorial fallback **only** if library empty  

Live search needs `platformProjectId` (orchestrator injects from page/conversation). Unbound captures → search count 0 is expected; use captures path.

Staging smoke: `knowledge/spirion-creation-landing-staging-smoke.md`.

**Tokens vs Literals:** Spirion is not a full Collection token library. Prefer pack bindings when they match; otherwise deliberately choose literals (`set_style` / props) and say so — do not stall for missing tokens. See `assistant-spirion-mcp.md` § Tokens vs Literals.
