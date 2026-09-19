# Collection Team — ecosystem consumers

**SSOT:** Plexon `specs/api/collection-members.md` + Collection invites.  
**UI pattern:** Audion `ProjectTeamList` / Checkion `ProjectTeamPanel` — magazine rows, inline draft email, invite link (no always-on Field).

## Apps (staging)

| App | Surface | BFF | Notes |
|-----|---------|-----|--------|
| Audion | Project detail Team list | `/api/projects/:id/members` · invites · sync-collection-members | Local `members[]` migrate additive only |
| Checkion | ProjectWorkspace intro aside | `/api/projects/:id/members` · invites | |
| Brandion | ProjectWorkspace intro aside | `/api/projects/:id/members` · invites | |
| Creation | Project detail panel | `/api/projects/:id/members` · invites | Scene share-invite stays editor-scoped |
| Metron | Project detail panel | `/api/projects/:id/members` · invites | Gate via `collection-access` |
| Videon | Collections hub Team panel | `/api/collections/:platformProjectId/members` · invites | Local `videon_workspace_members` = projection only; do not rewrite replay |

## Non-goals

- Company-wide visibility
- Cross-company invites
- Changing Videon members replay / provisioning upsert
- Prod control plane `chbrdk/PLEXON`
