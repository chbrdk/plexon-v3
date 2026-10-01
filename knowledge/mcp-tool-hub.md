# MCP Tool Hub — knowledge companion

**Spec SoT:** `specs/domain/mcp-tool-hub.md` · Canva: `mcp-hub-canva.md` · H4: `mcp-hub-collection-scope.md`  
**Status:** Wave H4 landed — 2026-10-01 (catalog bridge + Collection enable)  
**Related:** `knowledge/capability-catalog.md` · `knowledge/plexon-assistant-orchestrator.md`

## Waves

| Wave | Ship |
|------|------|
| H0–H3 | Spec, registry, policies, writes, OAuth, Canva MCP — **done** |
| H4 | Catalog bridge (`hub.canva.*`) + Collection Hub opt-out — **done** |

## Dual-run (still)

Keep `*_MCP_URL` + product gates. Hub does not replace them in H4.

## Collection Hub enable (H4)

- Opt-out: active Hub servers on by default for a Collection.
- Company managers toggle on Collection dashboard → `GET/PUT …/mcp-hub-servers`.
- Free-chat with `platformProjectId` filters disabled servers.

## Catalog bridge

- Default map: `canva_brand_templates_list` → `hub.canva.templates` (etc.).
- Admin can override tool `capabilityId`.
- Agent adapter resolves Hub tools; Flow promote still needs `surfaces.flow` (pilot caps are Agent-only).

## Ops paths

| Surface | Path |
|---------|------|
| Collection Hub toggles | `/api/platform/projects/:id/mcp-hub-servers` |
| Migration | `0026_mcp_collection_servers.sql` |
| Canva MCP / OAuth | see H3 |

Env unchanged from H3 for Canva.
