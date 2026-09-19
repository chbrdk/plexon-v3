# Collection members API

**Status:** Accepted · 2026-09-19  
**Parent:** `specs/domain/collection-invite-links.md` · Access Model B  
**Companion:** `specs/api/collection-invites.md`

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/platform/provisioning/collections/:platformProjectId/members` | Service secret + contract + `X-Plexon-User-Id` (or session) | List creator + assignments |
| `POST` | `…/members` | Service + user (manage lifecycle) | Add member by email (additive) |
| `DELETE` | `…/members/:userId` | Service + user (manage lifecycle) | Revoke assignment (never creator) |

## GET response

```json
{
  "items": [
    {
      "userId": "uuid",
      "email": "owner@example.com",
      "name": "Owner",
      "role": "admin",
      "source": "creator"
    },
    {
      "userId": "uuid",
      "email": "peer@example.com",
      "name": "Peer",
      "role": "member",
      "source": "assignment"
    }
  ]
}
```

- Creator (`platform_projects.created_by_user_id`) is always included as `source: creator`, `role: admin`.
- Assignments use `source: assignment`.
- Actor MUST pass `userCanViewPlatformProject` (or manage lifecycle).

## POST body

```json
{
  "email": "peer@example.com",
  "role": "member"
}
```

- `role`: `member` \| `admin` (default `member`)
- Resolve user by email (case-insensitive).
- Invitee MUST be in the Collection’s company (`company_users`) unless global admin.
- **Additive only:** if assignment already exists → keep existing role (no downgrade), return `status: "already_member"`.
- If missing → insert assignment, return `status: "added"`.
- Never DELETE other members on POST. Never mutate the creator row via this endpoint.

## POST response

```json
{
  "status": "added",
  "userId": "uuid",
  "email": "peer@example.com",
  "role": "member"
}
```

## DELETE

- Removes `user_platform_project_assignments` for that user + Collection.
- Creator cannot be revoked (`400` / `creator_immutable`).
- Requires manage-lifecycle.

## Errors

| Status | When |
|--------|------|
| 401 | Missing auth |
| 403 | Not allowed / wrong company |
| 404 | Unknown Collection / unknown email |
| 400 | Invalid body / revoke creator |
