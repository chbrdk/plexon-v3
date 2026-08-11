# Brandion MCP in Plexon Assistant

**Spec:** `specs/domain/assistant-brandion-mcp.md`  
**Coolify:** brandion-mcp `g79ues4e48rh8wq6g3jrabpv` · plexon `BRANDION_MCP_URL`

## Gate (2026-08-11)

`resolveUseProductMcp` (`lib/assistant/product-mcp-gate.ts`): URL set **and** (matching entitlement **or** any platform `pageContext.product` **or** any sibling entitlement active).

Cross-ask: Brandion embed asking AUDION personas also needs `AUDION_MCP_URL` on plexon + same gate.

## Staging URLs (public FQDN — Coolify projects are separate; internal DNS often fails)

| Key | Value |
|-----|--------|
| `BRANDION_MCP_URL` | `https://g79ues4e48rh8wq6g3jrabpv.projects-a.plygrnd.tech` |
| `AUDION_MCP_URL` | `https://mcp-audion.projects-a.plygrnd.tech` |
| `CHECKION_MCP_URL` | `https://checkion-v3-mcp.projects-a.plygrnd.tech` |

Do **not** set `http://brandion-mcp:3100` on plexon-v3 (different Coolify project → hostname does not resolve). Prefer one public URL; delete duplicate env rows.

## System prompt

`buildBrandionIntegrationContextBlock` — when active, instruct model to call `brandion_tokens_list` / guidelines tools for CD colors.

## Content cards

| Block | Builder | Organism |
|-------|---------|----------|
| `color_swatch_grid` | `lib/assistant/ui-blocks/build-brandion-token-ui.ts` | `UiColorSwatchGrid` |
| `font_specimen_list` | same | `UiFontSpecimenList` |

Auto-emit: `orchestrator-complete.ts` after `brandion_tokens_list`.
