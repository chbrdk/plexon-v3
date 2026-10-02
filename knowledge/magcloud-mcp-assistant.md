# Magcloud MCP in Plexon Assistant

**Spec:** `specs/domain/assistant-magcloud-mcp.md` · Product: `magcloud/mcp-server/`

## Coolify (live)
| Item | Value |
|------|--------|
| App | `magcloud-mcp` · `kqqn127a3uscujl2m5nvrj8d` |
| FQDN | `https://kqqn127a3uscujl2m5nvrj8d.projects-a.plygrnd.tech` |
| Port | **3105** |
| Dockerfile | `mcp-server/Dockerfile` · context `mcp-server` |

1. Env on MCP: `MAGCLOUD_UNIVERSE_URL=https://magcloud-universe.projects-a.plygrnd.tech`, `MAGCLOUD_API_URL=https://magcloud.projects-a.plygrnd.tech`, `MAGCLOUD_WRITE_SECRET`/`PLEXON_SERVICE_SECRET`, `MCP_STATELESS=1`, `MCP_PORT=3105`
2. On **plexon-v3**: `MAGCLOUD_MCP_URL=https://kqqn127a3uscujl2m5nvrj8d.projects-a.plygrnd.tech`

## Wave 2 tools
- Read: `meta_conflicts_list`
- Write (Confirm): `meta_conflict_resolve`, `ingest_start` (local PPTX base64 ≤25 MiB)
- SharePoint sync tools: **blocked** until Graph secrets

## Auto-UI
Boards → `link_list` · summarize → `metric_grid` · slides → `link_list` · ingest → `step_list` · conflicts → `key_value_list`

## Smoke
1. „Liste Magcloud Boards“ → boards_list + link_list  
2. „Fasse Magenta_Pitch… zusammen“ → board_summarize + metrics  
3. „Offene Meta-Konflikte…“ → meta_conflicts_list  
4. Resolve / Ingest nur nach Confirm
