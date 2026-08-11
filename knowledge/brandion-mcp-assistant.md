# Brandion MCP in Plexon Assistant

**Spec:** `specs/domain/assistant-brandion-mcp.md`  
**Coolify:** brandion-mcp `g79ues4e48rh8wq6g3jrabpv` · plexon `BRANDION_MCP_URL` (prefer public FQDN like Checkion MCP if internal DNS fails)

## Gate (2026-08-11)

`resolveUseBrandionMcp`: URL set **and** (`entitlements.brandion === active` **or** host `pageContext.product === brandion`).

Symptom if only entitlement was required: assistant invents “Brand-Daten nicht direkt abrufbar / MCP nicht aktiv” because tools were never offered.

## System prompt

`buildBrandionIntegrationContextBlock` — when active, instruct model to call `brandion_tokens_list` / guidelines tools for CD colors.

## Content cards (2026-08-11)

| Block | Builder | Organism |
|-------|---------|----------|
| `color_swatch_grid` | `lib/assistant/ui-blocks/build-brandion-token-ui.ts` | `UiColorSwatchGrid` |
| `font_specimen_list` | same | `UiFontSpecimenList` |

Auto-emit: `orchestrator-complete.ts` after `brandion_tokens_list` / `brandion.tokens_list`.  
MCP rows: color → `hex`; typography → `family` / `weight` (parsed in `brandion-v3/mcp-server`).
