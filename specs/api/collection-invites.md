# Collection invites API

**Status:** Accepted · 2026-09-10 (optional `toEmail` · 2026-09-21)  
**Parent:** `specs/domain/collection-invite-links.md`  
**Mail:** `specs/api/transactional-email.md`

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/platform/provisioning/collections/:platformProjectId/invites` | Service secret + contract + `X-Plexon-User-Id` | Create invite (product BFF) |
| `GET` | `/api/platform/provisioning/collections/:platformProjectId/invites` | Service + user | List active invites (no plain tokens) |
| `DELETE` | `/api/platform/provisioning/collections/:platformProjectId/invites/:inviteId` | Service + user | Revoke |
| `POST` | `/api/platform/invites/:token/accept` | Session (or Bearer) | Accept invite |
| `GET` | `/invite/:token` | Session (middleware) | Accept UI → POST accept → redirect |

## Create body

```json
{
  "role": "member",
  "sceneId": "optional-scene-uuid",
  "expiresInDays": 7,
  "maxUses": null,
  "toEmail": "peer@example.com"
}
```

- `role`: `member` \| `admin` (default `member`)
- `expiresInDays`: 1–30 (default 7)
- `maxUses`: positive int or null (unlimited)
- `toEmail` optional — when set, Plexon best-effort sends `collection_invite` with the absolute `inviteUrl` (see transactional-email API). Invalid address → `400` before mint.

## Create response

```json
{
  "inviteId": "uuid",
  "inviteUrl": "https://…/invite/inv_…",
  "role": "member",
  "sceneId": "…",
  "expiresAt": "ISO-8601",
  "maxUses": null,
  "emailedTo": "peer@example.com"
}
```

- `emailedTo` only when `toEmail` was provided and a send was attempted.

## Accept response

```json
{
  "platformProjectId": "…",
  "role": "member",
  "redirectUrl": "https://creation…/editor?sceneId=…&platformProjectId=…"
}
```

`redirectUrl` uses `NEXT_PUBLIC_CREATION_URL` when set; otherwise null and the UI shows success without navigation.

## Errors

| Status | When |
|--------|------|
| 401 | Missing auth |
| 403 | Not allowed to create / wrong company on accept |
| 404 | Unknown token / invite |
| 410 | Expired, revoked, or max uses exhausted |
| 503 | DB / CREATION URL misconfig (redirect only soft-fails) |
