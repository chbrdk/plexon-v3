# MCP Hub — Canva pilot (H3)

**Status:** Wave H3  
**Parent:** [`mcp-tool-hub.md`](./mcp-tool-hub.md)  
**Owner:** PLEXON v3  
**Decision (open Q4):** **Thin Plexon Canva MCP proxy** at `/api/platform/mcp-hub/canva` — not a separate repo for the pilot.

## Purpose

Let Free-chat use **Canva Connect** for social templates / export while Brandion stays guideline SSOT and CREATION stays editor/sites/print.

## Auth

| Piece | Value |
|-------|--------|
| Flow | OAuth 2.0 Authorization Code + **PKCE S256** |
| Authorize | `https://www.canva.com/api/oauth/authorize` |
| Token | `https://api.canva.com/rest/v1/oauth/token` |
| Client secrets | Env refs on Hub server `authConfig` (`CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET`) |
| User tokens | Encrypted in `mcp_oauth_bindings` (`MCP_HUB_TOKEN_ENCRYPTION_KEY`) |
| Redirect | `{PUBLIC_APP_URL\|NEXTAUTH_URL}/api/platform/mcp-hub/oauth/canva/callback` |

### Pilot scopes (space-separated)

```
design:meta:read design:content:read design:content:write
brandtemplate:meta:read brandtemplate:content:read
asset:read asset:write
```

Autofill (`brandtemplate:content:read` + Autofill APIs) may require Enterprise — tool returns explicit `enterprise_required` / open-template URL fallback.

## Tools (Canva MCP)

| mcpName | sideEffect | Notes |
|---------|------------|--------|
| `brand_templates_list` | read | `GET /v1/brand-templates` |
| `design_open_url` | read | Resolve / return Canva edit or create URL |
| `design_export` | write | `POST /v1/exports` (+ optional poll) |
| `design_autofill` | write | `POST /v1/autofills` — fail closed with CTA if plan/API denies |

Exposed Anthropic names: `canva_*`.

## Runtime

1. Hub server `slug=canva`, `authKind=oauth_user`, `baseUrl` → Plexon Canva MCP.
2. Hub calls MCP with `X-Plexon-Service-Secret` + `X-Plexon-User-Id`.
3. Unbound user → tool result `{ error: "oauth_required", connectUrl }` → Assistant `alert` + `link_list` CTA.
4. Planner: Canva `routingHints` boost social prompts; **never** prefer Canva when intent is `creation_scene_edit` / `creation_design`.

## Operator setup

1. Canva Developer Portal → integration → enable **exactly** these scopes (Scopes tab) → redirect URL.
2. Coolify env: `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `MCP_HUB_TOKEN_ENCRYPTION_KEY` (32+ chars).
3. Admin MCP Hub → **Bootstrap Canva** (or create server) → Discover → status `active`.
4. User: Settings → Connect Canva (or CTA from chat).

`invalid_scope` from Canva means the integration has not enabled one of the requested scopes — enable them in the Portal, then retry Connect.

## Acceptance

See parent H3 checklist.
