# SPIRION MCP ↔ Plexon Assistant

**Spec:** `specs/domain/assistant-spirion-mcp.md`  
**Coolify dig-api:** `spirion-api.projects-a.plygrnd.tech` · MCP `POST /mcp`

| Env | Staging value |
|-----|----------------|
| `SPIRION_MCP_URL` | `https://spirion-api.projects-a.plygrnd.tech/mcp` |
| `DIG_MCP_URL` | legacy fallback only |

Gate: `resolveUseSpirionMcp` — URL + entitlement / host product / sibling.

Read families: `spirion_references`, `spirion_screens` (no job/generate writes in Welle 1).

Creation scene edits may call search tools for inspiration; finish with `creation_scene_content_audit` / `creation_scene_preview`.

**Tokens vs Literals:** Spirion is not a full Collection token library. Prefer pack bindings when they match; otherwise deliberately choose literals (`set_style` / props) and say so — do not stall for missing tokens. See `assistant-spirion-mcp.md` § Tokens vs Literals.
