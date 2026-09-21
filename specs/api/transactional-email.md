# Transactional email API — PLEXON

**Status:** Accepted · 2026-09-21  
**Parent:** `specs/domain/transactional-email.md`  
**Companions:** `specs/api/collection-members.md` · `specs/api/collection-invites.md`

## Ownership

Outbound transactional mail is an **internal Plexon concern**. There is no public product HTTP endpoint for arbitrary “send email” in P0/P1. Capability apps trigger mail only by calling existing provisioning mutations (members / invites) or by sending users to Plexon auth routes.

## Transport resolution (implementation)

Priority (password-reset mailer + HTTPS bridge for blocked TCP 587):

1. **SMTP-HTTP bridge** when `PLEXON_SMTP_HTTP_URL` (or `SMTP_HTTP_URL`) **and** `PLEXON_SMTP_HTTP_TOKEN` (or `SMTP_HTTP_TOKEN`) are set — Coolify Traefik → host-local SMTP  
2. Else SMTP when `PLEXON_SMTP_HOST` or `SMTP_HOST` is set  
3. Else Mailgun HTTP when `MAILGUN_API_KEY` + `MAILGUN_DOMAIN`  
4. Else **log** (link/body in container logs)

Env inventory: `knowledge/transactional-email.md` · `knowledge/coolify-env-variablen.md`.

## Internal send contract (P1 shape)

Not a public REST surface for clients — library call from route handlers / domain libs:

```ts
sendTransactionalEmail({
  kind: 'password_reset' | 'collection_member_added' | 'collection_invite' | …,
  to: string,
  payload: Record<string, unknown>, // kind-specific; never log secrets/tokens at info
})
```

| Kind | Required payload fields | Notes |
|------|-------------------------|-------|
| `password_reset` | `resetLink` | Existing `sendPasswordResetEmail` |
| `collection_member_added` | `collectionName`, `role`, `launchUrl`, `actorName?` | Only when members POST returns `added` |
| `collection_invite` | `inviteUrl`, `collectionName`, `role`, `expiresAt?`, `actorName?` | When create body includes `toEmail` |
| `password_changed` | `loginUrl` | After reset consume / change-password |
| `account_welcome` | `loginUrl` or `setPasswordLink` | After self-register (admin invite-to-register later) |
| `collection_member_removed` | `collectionName` | After DELETE members |

## Auth routes (existing)

| Method | Path | Mail |
|--------|------|------|
| `POST` | `/api/auth/request-password-reset` | `password_reset` (best-effort) |
| `POST` | `/api/auth/reset-password` | `password_changed` (best-effort) |
| `POST` | `/api/auth/change-password` | `password_changed` (best-effort) |
| `POST` | `/api/auth/register` | `account_welcome` (best-effort) |

## Collection members — notify

**Endpoint:** `POST /api/platform/provisioning/collections/:platformProjectId/members`  
**Body:** unchanged (`email`, `role`).

| Result `status` | Mail |
|-----------------|------|
| `added` | MUST enqueue/send `collection_member_added` (best-effort) |
| `already_member` | MUST NOT send |

Optional future body flag `notify: false` MAY suppress send (default `true`). Not required for P1.

DELETE member: MUST best-effort send `collection_member_removed`.

## Collection invites — optional email

**Endpoint:** `POST /api/platform/provisioning/collections/:platformProjectId/invites`

### Create body (extended)

```json
{
  "role": "member",
  "sceneId": "optional-scene-uuid",
  "expiresInDays": 7,
  "maxUses": null,
  "toEmail": "peer@example.com"
}
```

- `toEmail` optional. When present: normalize/validate; MUST send `collection_invite` with absolute `inviteUrl` (best-effort).
- Same-company check for `toEmail` is **not** required at mint time (invitee must still be same-company on **accept**). Products MAY still prefer add-by-email for known peers.
- Invalid `toEmail` → `400` before create (do not mint a token for a bad address when the caller asked to email).

### Create response (extended)

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

- `emailedTo` present only when `toEmail` was accepted and a send was attempted (success or best-effort failure still MAY set it so UI can show “sent / check logs”).
- Clipboard flow without `toEmail`: omit `emailedTo`.

## Health / diagnostics

`GET /api/health` MUST expose mail transport diagnostics without secrets (today: `passwordResetMail`). P1 SHOULD rename or add a sibling `transactionalMail` with the same flags (`transport`, `smtpHostSet`, …) so new kinds share one readout.

## Errors

Mail transport failures do **not** change HTTP status of successful members/invites/reset-request mutations. Log with kind + recipient domain (not full address if policy prefers) + error class.

## Tests (P1+)

- Transport resolve: SMTP / Mailgun / log  
- Members POST `added` → send once; `already_member` → no send  
- Invites POST with `toEmail` → send with invite URL containing token; without `toEmail` → no send  
- Password reset unchanged anti-enumeration + send  
