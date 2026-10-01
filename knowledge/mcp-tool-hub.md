# MCP Tool Hub — knowledge companion

**Spec SoT:** `specs/domain/mcp-tool-hub.md` · Canva: `specs/domain/mcp-hub-canva.md`  
**Status:** Wave H3 landed — 2026-10-01 (OAuth + thin Canva MCP)  
**Related:** `knowledge/capability-catalog.md` · `knowledge/plexon-assistant-orchestrator.md` · product MCP notes (`*-mcp-assistant.md`)

## Why

Suite product MCPs are hard-wired (Coolify URL → gate → tool-catalog → planner). External tools (Canva for social, later Notion/Linear/…) must not each require a full custom integration. Plexon Admin registers MCP servers once; Agents consume allowed tools.

## Split of concerns

| Layer | Owns |
|-------|------|
| **MCP Tool Hub** | Server registry, discovery, OAuth bindings, ACL, runtime injection |
| **Capability Catalog** | Typed Suite capabilities, Flow adapters, promote chat→Flow |
| **Product MCP repos** | AUDION/CHECKION/… tool implementations |
| **CREATION** | Owned editor / sites / print |
| **Canva (pilot)** | Social templates, autofill, export — thin MCP in Plexon |

## Waves (operator view)

| Wave | Ship |
|------|------|
| H0–H2 | Spec, registry, policies, write confirm, routing hints — **done** |
| H3 | OAuth + **Canva** pilot — **done** |
| H4 | Catalog bridge + Collection enable; retire redundant gates |

## Dual-run

Until H4, keep existing `*_MCP_URL` + `product-mcp-gate.ts`. Hub rows with `source: env_bootstrap` mirror those URLs. Free-chat merges both surfaces; Hub `exposedName` always uses `{slug}_` prefix to avoid collisions.

## Runtime (H3)

- Hub injects enabled tools: reads always; write/destructive only when planner `allowWriteTools`.
- `requireConfirm` / destructive → `pendingConfirmation`.
- `oauth_user`: Hub → MCP with `X-Plexon-Service-Secret` + `X-Plexon-User-Id`; unbound → `oauth_required` + Settings CTA.
- Planner: routingHints boost; **Canva filtered out** for `creation_scene_edit` / `creation_design`.

## Canva vs CREATION

| User says | Prefer |
|-----------|--------|
| Instagram / LinkedIn / Carousel / Story / Canva / Social Post | Canva Hub |
| Landing / Newsletter / Magazin / Site Kit / Editor / Composition | CREATION MCP |
| Farbe / Guideline / Token | Brandion MCP |

## Paths (H3)

| Surface | Path |
|---------|------|
| Admin | `/admin/mcp-hub` |
| Canva MCP | `POST /api/platform/mcp-hub/canva` |
| OAuth start | `GET /api/platform/mcp-hub/oauth/:slug/start` |
| OAuth callback | `GET /api/platform/mcp-hub/oauth/:slug/callback` |
| OAuth status | `GET/DELETE /api/platform/mcp-hub/oauth/:slug/status` |
| Bootstrap | `POST /api/admin/mcp-servers/bootstrap` `{ kind: "canva"\|"audion"\|"all" }` |
| Migrations | `0023` … `0025_mcp_oauth_bindings.sql` |

## Ops env

- `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`
- `MCP_HUB_TOKEN_ENCRYPTION_KEY` (≥16 chars)
- `PLEXON_SERVICE_SECRET`, `NEXTAUTH_URL` or `PUBLIC_APP_URL`
- Canva Developer Portal redirect: `{app}/api/platform/mcp-hub/oauth/canva/callback`
