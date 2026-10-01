# MCP Tool Hub — knowledge companion

**Spec SoT:** `specs/domain/mcp-tool-hub.md`  
**Status:** Wave H2 landed — 2026-10-01 (policy + write confirm + routing hints + AUDION env bootstrap)  
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
| **Canva (pilot)** | Social templates, autofill, export — via Hub |

## Waves (operator view)

| Wave | Ship |
|------|------|
| H0 | Spec + this doc + index/paths — done |
| H1 | Admin registry + discover; read tools in free-chat — **done** |
| H2 | Policy + write confirm + routing hints + AUDION env_bootstrap — **done** |
| H3 | OAuth + **Canva** pilot |
| H4 | Catalog bridge + Collection enable; retire redundant gates |

## Dual-run

Until H4, keep existing `*_MCP_URL` + `product-mcp-gate.ts`. Hub rows with `source: env_bootstrap` mirror those URLs. Free-chat merges both surfaces; Hub `exposedName` always uses `{slug}_` prefix to avoid collisions.

## Runtime (H2)

- Hub injects enabled tools: reads always; write/destructive only when planner `allowWriteTools`.
- `requireConfirm` / destructive → `pendingConfirmation` like product write tools.
- Org policy `effect=deny` hides the server; `allowWrite=false` strips write/destructive Hub tools.
- Planner: `routingHints` match annotates reasoning; with write verbs also enables `allowWriteTools`.

## Canva vs CREATION (routing cheat-sheet)

| User says | Prefer |
|-----------|--------|
| Instagram / LinkedIn / Carousel / Story / Canva / Social Post | Canva Hub |
| Landing / Newsletter / Magazin / Site Kit / Editor / Composition | CREATION MCP |
| Farbe / Guideline / Token | Brandion MCP |

## Paths (H2)

| Surface | Path |
|---------|------|
| Admin list | `/admin/mcp-hub` (`PATH_ADMIN_MCP_HUB`) |
| Admin detail | `/admin/mcp-hub/:id` |
| API list/create | `GET/POST /api/admin/mcp-servers` |
| API detail | `GET/PATCH/DELETE /api/admin/mcp-servers/:id` |
| Discover | `POST /api/admin/mcp-servers/:id/discover` |
| Test | `POST /api/admin/mcp-servers/:id/test` |
| Tool patch | `PATCH /api/admin/mcp-servers/:id/tools/:toolId` |
| Policies | `GET/PUT /api/admin/mcp-servers/:id/policies` |
| Env bootstrap | `POST /api/admin/mcp-servers/bootstrap` (AUDION) |
| Migrations | `0023_mcp_tool_hub.sql` · `0024_mcp_tool_hub_policies.sql` |

Store `baseUrl` per server row; auth via env key refs (`bearerEnvKey`). No hardcoded FQDNs in app code.

## Ops notes

- Discovery cache ~60s; Admin “Refresh tools” bypasses cache. Routing-hint cache ~60s (invalidated on patch/discover).
- Never return decrypted OAuth tokens or raw service secrets from Admin GET.
- Staging Canva needs Developer Portal app + redirect to Plexon OAuth callback (H3).
