# MCP Tool Hub (Plexon)

**Status:** Wave H1 landed (registry + discover + Admin + free-chat read injection) — 2026-10-01  
**Owner:** PLEXON v3  
**Federation:** `2026-05-plexon-federation-v3`  
**Companions:**
- Capability Catalog: [`capability-catalog.md`](./capability-catalog.md)
- Assistant actor identity: [`assistant-actor-identity.md`](./assistant-actor-identity.md)
- Product MCP gates (today): [`assistant-creation-mcp.md`](./assistant-creation-mcp.md) · Brandion / Audion / Checkion / Echon / Videon / Metron / Spirion siblings
- Knowledge: `knowledge/mcp-tool-hub.md` · `knowledge/paths.md` · `knowledge/capability-catalog.md`

## Purpose

Plexon MUST become the **control plane for MCP servers and their tools** across the suite:

1. Admins **register** MCP servers (suite product MCPs **and** external ones such as Canva).
2. Plexon **discovers** tools (`tools/list`), stores a normalized inventory, and applies **policy** (org / Collection / role / write confirm).
3. Every Agent surface (Free-chat, domain specialists, Collection Flow via Capability Catalog adapters) **consumes** allowed tools without a new hard-coded integration each time.

Today each product MCP is wired by Coolify env + `product-mcp-gate.ts` + `tool-catalog.ts` + planner heuristics. That does not scale to Canva, Notion, Linear, etc.

## Problem (today)

| Layer | Gap |
|-------|-----|
| Coolify `*_MCP_URL` envs | One env + gate per product; no Admin CRUD |
| `AssistantProductMcpId` enum | Closed set — external servers cannot appear |
| `tool-catalog.ts` families | Hand-maintained regexes per product |
| Planner / specialists | New server ⇒ new intent patterns + prompts |
| Capability Catalog | Typed Suite capabilities Agent↔Flow — **not** a dynamic MCP registry |

## Non-goals

- Replacing product-owned MCP servers (AUDION/CHECKION/… stay product repos).
- Replacing the Capability Catalog — Hub **feeds** tools; Catalog still owns typed Suite capabilities + Flow adapters.
- Auto-publishing to third-party social networks in Wave 0–1 (Canva = design/export/open; LinkedIn/Meta post = Later).
- Letting arbitrary MCP tools become Collection Flow node kinds without a Capability Catalog entry.
- Storing third-party OAuth refresh tokens in client browsers (tokens stay server-side, encrypted).
- MUI / `@msqdx/react` Admin chrome — Admin UI uses `@msqdx/ui`.

## Locked decisions

| Decision | Choice |
|----------|--------|
| SoT for registered servers | **Plexon DB** (`mcp_servers`, `mcp_server_tools`, policies) — not Coolify alone |
| Discovery | Plexon calls MCP `initialize` + `tools/list` (cached TTL); Admin can force refresh |
| Runtime injection | Free-chat merges **hub tools** with **legacy product MCP** branches until migration complete |
| Naming | Tool names exposed to Anthropic: `{server_slug}_{mcp_tool_name_with_underscores}` (collision-safe) |
| Auth classes | `none` \| `service_bearer` \| `service_secret_headers` \| `oauth_user` (PKCE) |
| Actor | Access Model B unchanged: session user / `actorUserId` injected where the target MCP expects it |
| Writes | Hub tools tagged `sideEffect: read \| write \| destructive`; writes require planner `allowWriteTools` **and** confirm gate when `requireConfirm` |
| Suite first-class MCPs | May remain env-bootstrapped (`AUDION_MCP_URL`, …) **and** appear as Hub rows (`source: env_bootstrap`) editable later |
| External pilot | **Canva Connect** via dedicated MCP wrapper or Hub-registered Connect proxy — first non-suite server |
| Capability Catalog link | Optional `capabilityId` on a hub tool maps into catalog Agent adapter; Flow exposure still needs `surfaces.flow` |

## Glossary

| Term | Meaning |
|------|---------|
| **MCP Server (Hub)** | Registered endpoint + auth + slug in Plexon |
| **Hub Tool** | One discovered MCP tool, normalized + policy wrappers |
| **Server slug** | Stable id (`canva`, `audion`, `notion`) used as tool-name prefix |
| **Env bootstrap** | Legacy Coolify URL imported as a Hub row on deploy/migrate |
| **OAuth binding** | Per-user (or per-org) token set for `oauth_user` servers |
| **Tool policy** | Allow/deny + confirm + Collection scope for a tool or server |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Plexon Admin — MCP Tool Hub                              │
│  servers CRUD · discover · policy · OAuth apps           │
└───────────────────────────┬──────────────────────────────┘
                            │ persist
                            ▼
┌──────────────────────────────────────────────────────────┐
│ Registry (Postgres)                                      │
│  mcp_servers · mcp_server_tools · mcp_oauth_bindings     │
│  mcp_tool_policies                                       │
└───────────────────────────┬──────────────────────────────┘
                            │ resolve for turn
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   Free-chat Agent    Specialists      Capability Catalog
   (tool filter)      (families+)      (optional map)
          │                 │                 │
          └────────────┬────┴─────────────────┘
                       ▼
              MCP transport (SSE/HTTP)
         suite product MCPs + external MCPs
```

### Relationship to Capability Catalog

- **Hub** = inventory + connectivity + ACL for raw MCP tools.
- **Catalog** = curated, typed capabilities with Flow ports and promote semantics.
- Wave rule: new external power lands in Hub first; promote hot paths into Catalog when Agent↔Flow parity is needed.

## Data model (logical)

### `mcp_servers`

| Field | Notes |
|-------|--------|
| `id` | cuid |
| `slug` | unique, kebab (`canva`, `audion`) |
| `displayName` | Admin label |
| `baseUrl` | MCP HTTP/SSE endpoint (no hardcoded FQDNs in app code — store in DB / env) |
| `transport` | `streamable_http` (default) |
| `authKind` | `none` \| `service_bearer` \| `service_secret_headers` \| `oauth_user` |
| `authConfig` | Encrypted JSON: header templates, env key refs — **never** log values |
| `status` | `draft` \| `active` \| `disabled` \| `error` |
| `source` | `manual` \| `env_bootstrap` |
| `productId` | Optional suite product id when first-class |
| `routingHints` | string[] keywords for planner (e.g. `social`, `instagram`, `canva`) |
| `lastDiscoveryAt` / `lastError` | Ops |

### `mcp_server_tools`

| Field | Notes |
|-------|--------|
| `serverId` | FK |
| `mcpName` | Raw MCP tool name |
| `exposedName` | Anthropic name = `{slug}_{normalized}` |
| `description` | From MCP |
| `inputSchema` | JSON Schema snapshot |
| `sideEffect` | `read` \| `write` \| `destructive` (Admin override allowed) |
| `requireConfirm` | bool |
| `capabilityId` | Optional catalog link |
| `enabled` | bool |

### `mcp_tool_policies`

| Field | Notes |
|-------|--------|
| Scope | `org` \| `company` \| `collection` \| `role` |
| `serverId` / `toolId` | Server-wide or per-tool |
| Effect | `allow` \| `deny` |
| `allowWrite` | Override write for scope |

### `mcp_oauth_bindings`

| Field | Notes |
|-------|--------|
| `serverId` + `userId` (and optional `companyId`) | |
| Encrypted tokens + expiry + scopes | Refresh server-side only |

## Auth

### Service / product MCPs (existing)

Reuse patterns from today: Bearer machine token + `PLEXON_SERVICE_SECRET` + `X-Plexon-User-Id` where Access Model B applies. Hub stores **references** to env keys (`AUDION_API_TOKEN`) rather than duplicating secrets into Postgres when `source=env_bootstrap`.

### OAuth user (`oauth_user`)

1. Admin configures OAuth app (client id, redirect under Plexon `/api/platform/mcp-hub/oauth/...`, scopes).
2. User connects from Settings or first tool use → PKCE.
3. Tool calls fail closed with `oauth_required` + connect URL UI block if unbound.
4. Canva pilot scopes (minimum): design content read/write, design meta read, brand template read, asset read/write — exact list in Canva wave companion.

## Runtime (Assistant)

1. Resolve **active** Hub servers allowed for actor + Collection context.
2. Ensure OAuth bindings for `oauth_user` servers (or exclude write tools / surface connect CTA).
3. Merge tool definitions into the turn’s tool list (alongside legacy product MCP fetch while dual-running).
4. `toolAllowedByPlan`:
   - Hub read tools: allowed when server/tools enabled and policy allows.
   - Hub write/destructive: require `plan.allowWriteTools` and confirm when `requireConfirm`.
5. On `tools/call`: Hub transport adds auth headers / user token; injects actor headers for suite MCPs.
6. Cache `tools/list` per server (TTL ~60s, same order of magnitude as today’s product MCP cache).

### Planner

- Keep existing product intents.
- Add **Hub routing**: if prompt matches a server’s `routingHints` (or Admin “default for social”), prefer that server’s families / exposed tools and set `allowWriteTools` when write verbs or server-tagged write intents match.
- LLM planner system text MUST mention Hub servers that are active for the turn (slug + one-line purpose) — no dump of full schemas into the system prompt.

## Admin UX

Route family (canonical paths via `lib/paths` / `lib/constants` — document in `knowledge/paths.md`):

- `/admin/mcp-hub` — server list
- `/admin/mcp-hub/:serverId` — detail: connection test, discover, tool table, policies, OAuth app
- Collection settings (Later): enable/disable Hub servers per Collection

Primitives: `@msqdx/ui` only. No parallel Admin kits.

## API (sketch)

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/api/admin/mcp-servers` | List / create |
| `GET/PATCH/DELETE` | `/api/admin/mcp-servers/:id` | Detail |
| `POST` | `/api/admin/mcp-servers/:id/discover` | Force `tools/list` |
| `POST` | `/api/admin/mcp-servers/:id/test` | Health / initialize |
| `GET/PATCH` | `/api/admin/mcp-servers/:id/tools` | Enable, sideEffect, confirm |
| `GET/PUT` | `/api/admin/mcp-servers/:id/policies` | ACL |
| `GET` | `/api/platform/mcp-hub/oauth/:slug/start` | User OAuth start |
| `GET` | `/api/platform/mcp-hub/oauth/:slug/callback` | OAuth callback |

All Admin routes: platform admin (or company admin — wave decision in implementation). User OAuth: signed-in session.

## Waves

### Wave H0 — Spec + inventory

- This spec + knowledge companion + paths stubs.
- Document dual-run with env-bootstrapped suite MCPs.

### Wave H1 — Registry + discover (read-only runtime)

- Tables + Admin CRUD + discover.
- Free-chat can **list** Hub read tools from one manual test server (e.g. echo/health MCP or read-only suite server).
- No OAuth yet; `service_bearer` / headers only.

### Wave H2 — Policy + write confirm + planner hints

- Policies; write gating; `routingHints` in planner.
- Migrate one suite MCP to `env_bootstrap` Hub row (still env secrets).

### Wave H3 — OAuth user + Canva pilot

- OAuth bindings UI.
- Canva: register server, connect account, tools for template list / autofill / export / open design URL.
- Planner: social-post prompts → Canva Hub tools; CREATION remains editor/site/print.
- Brandion stays guideline SSOT; Canva Brand Templates are execution templates (IDs in Hub config / Collection binding Later).

### Wave H4 — Catalog bridge + Collection scope

- Optional `capabilityId` mapping; Collection-level enable.
- Deprecate redundant hard-coded gates only when parity proven.

## Canva pilot (H3) — product split

| Job | Owner |
|-----|--------|
| Brand tokens / guidelines | Brandion |
| Sites, compositions, print, owned editor | CREATION |
| Social templates, rapid variants, PNG/MP4 export | **Canva** (Hub) |

Bot phrases:
- “LinkedIn Carousel / Instagram Post / Canva” → Canva Hub write tools.
- “Landingpage / Magazin / Editor / Site Kit” → CREATION MCP (unchanged).

## Acceptance

### H0

1. Spec linked from `knowledge/specs-index.md` and `knowledge/paths.md`.
2. Non-goals and dual-run with Capability Catalog explicit.

### H1

1. Admin can create a server, run discover, see tools.
2. Free-chat turn with Hub enabled exposes at least one Hub read tool under `exposedName`.
3. Disabled server ⇒ tools absent.
4. Secrets never returned by Admin GET (env refs / redaction only).

### H2

1. Write Hub tool blocked when `allowWriteTools=false`.
2. `routingHints` move planner toward the server on matching prompts (unit test).

### H3

1. User without Canva OAuth gets connect CTA, not silent failure.
2. Connected user can autofill or export via Hub tool in staging.
3. CREATION scene prompts do not prefer Canva solely because Hub is on.

## Risks

| Risk | Mitigation |
|------|------------|
| Tool-list explosion | Per-server enable; planner families/hints; max tools per turn |
| Name collisions | Forced `{slug}_` prefix |
| Secret sprawl | Env refs for bootstrap; encrypted vault for OAuth only |
| Confused deputy | Actor identity + Collection ACL + confirm on writes |
| Canva Enterprise-only autofill | Document; fallback “open template URL” tool |

## Open questions (resolve in H1–H2)

1. Company admin vs platform admin for server CRUD?
2. Should Collection owners enable Hub servers without org admin?
3. Keep Anthropic tool cap — dynamic prioritization algorithm?
4. First-party Canva MCP wrapper repo vs commercial MCP vs thin Plexon proxy?
