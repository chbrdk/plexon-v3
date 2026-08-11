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
| brandion-mcp | `g79ues4e48rh8wq6g3jrabpv` | https://g79ues4e48rh8wq6g3jrabpv.projects-a.plygrnd.tech |
| audion-mcp | `oswkso8os4wc0o4soosgwwcc` | https://mcp-audion.projects-a.plygrnd.tech |

## Smoke after plexon deploy

1. `GET /api/health` → `deployment.commitSha` matches pushed `main`.
2. Open FAB on Dashboard → **no** `iframe.plexon-assistant-embed-frame` (native hybrid).
3. Sheet width ~32rem; theme follows host.

Never commit the API token into the repo.

## Set app env via API

Bulk upsert (create or update):

```bash
PATCH https://coolify.plygrnd.tech/api/v1/applications/{uuid}/envs/bulk
Authorization: Bearer <token>
Content-Type: application/json

{ "data": [{ "key": "NEXT_PUBLIC_PLEXON_URL", "value": "https://plexon-v3.projects-a.plygrnd.tech", "is_buildtime": true, "is_runtime": true }] }
```

List: `GET …/applications/{uuid}/envs`

### Central Assistant FAB (product apps)

Set on **audion-v3**, **checkion-v3**, **brandion-v3** (not plexon — native host):

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_PLEXON_URL` | `https://plexon-v3.projects-a.plygrnd.tech` |

`NEXT_PUBLIC_*` needs **force rebuild** (`POST /deploy` with `force: true`) after change. Fallback chain in code: `NEXT_PUBLIC_PLEXON_URL` → `NEXT_PLEXON_BASE_URL` → `PLEXON_AUTH_URL` (only `NEXT_PUBLIC_*` is reliably inlined for the browser iframe).

### Brandion note (2026-08-11)

Env-only force deploy while `main` still pointed at an old `MSQDX_UI_REF` (pre-ChatOverlay) failed with `Module not found: ChatOverlay`. After pins `cfcc1d4`…`d60652b`, redeploy `cpzstvsfsgeifrob39m3ak3s` finished on `d60652be17d9`.

