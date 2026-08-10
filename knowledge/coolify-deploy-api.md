# Coolify deploy via API

Stand: 2026-08-10

Coolify MCP (`user-coolify`) is **read-only**. Deploys go through the Coolify REST API.

| Item | Value |
|------|--------|
| API base | `https://coolify.plygrnd.tech/api/v1` |
| Auth | Bearer token (same as Cursor MCP Coolify header in `~/.cursor/mcp.json`) |
| Endpoint | `POST /deploy` body `{ "uuid": "<app-uuid>", "force": true }` |

## Staging app UUIDs

| App | UUID | FQDN |
|-----|------|------|
| plexon-v3 | `n6f9gy85xsk3a0txflzavk3j` | https://plexon-v3.projects-a.plygrnd.tech |
| msqdx-ui Storybook | `rtxcfh4gtxi6yba5l70fu177` | https://ds.projects-a.plygrnd.tech |
| audion-v3 | `putvwgqq1c9yb30tsqosujde` | https://audion-v3.projects-a.plygrnd.tech |
| checkion-v3 | `valb5m9m099d9k7i2d1xkv6p` | https://checkion-v3.projects-a.plygrnd.tech |
| brandion-v3 | `hta84est51lwzkqol3hd6wig` | https://brandion-v3.projects-a.plygrnd.tech |

## Smoke after plexon deploy

1. `GET /api/health` → `deployment.commitSha` matches pushed `main`.
2. Open FAB on Dashboard → **no** `iframe.plexon-assistant-embed-frame` (native hybrid).
3. Sheet width ~32rem; theme follows host.

Never commit the API token into the repo.
