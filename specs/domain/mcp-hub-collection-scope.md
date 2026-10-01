# MCP Hub — Catalog bridge + Collection scope (H4)

**Status:** Wave H4  
**Parent:** [`mcp-tool-hub.md`](./mcp-tool-hub.md)  
**Companions:** [`capability-catalog.md`](./capability-catalog.md) · [`mcp-hub-canva.md`](./mcp-hub-canva.md)

## Purpose

1. Optional **`capabilityId`** on Hub tools links into the Capability Catalog **Agent** adapter (tracing / planner allowlist).
2. **Collection owners** can enable/disable org-active Hub servers for their Collection.
3. **Do not** retire hard-coded product MCP gates until parity is proven (out of scope for this wave).

## Locked decisions

| Question | Choice |
|----------|--------|
| Collection enable model | **Opt-out**: active Hub servers are on by default; Collection can set `enabled=false` |
| Who toggles | Company managers (`canManageCompany`) for the Collection’s company |
| Free-chat without Collection | No Collection filter (org Hub policy only) |
| Catalog `capabilityId` | Must be a known catalog id **or** a Hub pilot id (`hub.canva.*`); Flow still requires `surfaces.flow` |
| Product MCP gates | **Keep** dual-run; no deprecation in H4 |

## Data

### `mcp_collection_servers`

| Field | Notes |
|-------|--------|
| `platform_project_id` | Collection id |
| `server_id` | FK `mcp_servers` |
| `enabled` | bool |
| unique | `(platform_project_id, server_id)` |

### Hub tool `capability_id`

Admin PATCH; exposed in Admin tool table. Empty = no catalog link.

## Runtime

1. `listEnabledHubTools({ platformProjectId })`: if Collection has any disable rows, exclude those servers; missing row ⇒ enabled.
2. `capabilityIdFromAgentTool`: catalog toolNames first, then Hub exposedName → `capabilityId` map (cached ~60s).
3. Promote / Flow: unchanged — Hub pilot caps are `surfaces.flow: false`.

## API / UI

| Surface | Path |
|---------|------|
| Collection list/patch | `GET/PUT /api/platform/projects/:id/mcp-hub-servers` |
| Admin tool | existing PATCH + `capabilityId` |
| Collection dashboard | MCP Hub toggles band |

## Acceptance

1. Disabling a server on a Collection hides its Hub tools when that Collection is the chat context.
2. Setting `capabilityId=hub.canva.templates` on `canva_brand_templates_list` makes `capabilityIdFromAgentTool` resolve that id.
3. Product MCP env gates still load alongside Hub (dual-run).
