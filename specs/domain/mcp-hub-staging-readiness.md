# MCP Hub — Canva staging readiness (H5)

**Status:** Wave H5  
**Parent:** [`mcp-tool-hub.md`](./mcp-tool-hub.md) · [`mcp-hub-canva.md`](./mcp-hub-canva.md)

## Purpose

Make the Canva pilot **operable in staging** after H0–H4 code landed: env checklist, one-click Hub activate (bootstrap → discover → capabilityIds → optional `active`), Admin readiness panel. No Flow promote yet.

## Required Coolify env (plexon-v3)

| Key | Purpose |
|-----|---------|
| `CANVA_CLIENT_ID` | Canva Connect client id |
| `CANVA_CLIENT_SECRET` | Canva Connect secret |
| `MCP_HUB_TOKEN_ENCRYPTION_KEY` | ≥16 chars — encrypts user OAuth tokens |
| `PLEXON_SERVICE_SECRET` | Hub → Canva MCP calls (already set) |
| `NEXTAUTH_URL` or `PUBLIC_APP_URL` | OAuth redirect + Canva MCP baseUrl |

Canva Developer Portal redirect:

`{NEXTAUTH_URL}/api/platform/mcp-hub/oauth/canva/callback`

## Admin

- `GET /api/admin/mcp-servers/readiness` — boolean checklist (never secret values).
- `POST /api/admin/mcp-servers/bootstrap` `{ kind: "canva", activate: true }` — create/update Canva row, discover tools, seed default `capabilityId`s, set `active` when env ready.
- Hub list page shows readiness strip + activate CTA.

## Acceptance

1. Readiness endpoint reports missing Canva env keys when unset.
2. With env present, activate leaves Canva server `active` with discovered tools.
3. Settings Connect Canva still works once OAuth app + redirect are configured (manual Portal step).
