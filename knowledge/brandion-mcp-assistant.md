# Brandion MCP in Plexon Assistant

**Spec:** `specs/domain/assistant-brandion-mcp.md`  
**Coolify:** brandion-mcp `g79ues4e48rh8wq6g3jrabpv` · plexon `BRANDION_MCP_URL` (prefer public FQDN like Checkion MCP if internal DNS fails)

## Gate (2026-08-11)

`resolveUseBrandionMcp`: URL set **and** (`entitlements.brandion === active` **or** host `pageContext.product === brandion`).

Symptom if only entitlement was required: assistant invents “Brand-Daten nicht direkt abrufbar / MCP nicht aktiv” because tools were never offered.

## System prompt

`buildBrandionIntegrationContextBlock` — when active, instruct model to call `brandion_tokens_list` / guidelines tools for CD colors.
