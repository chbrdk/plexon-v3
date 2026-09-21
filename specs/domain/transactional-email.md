# Transactional email (SMTP) — PLEXON control plane

**Status:** Accepted · 2026-09-21  
**Layer:** Domain (PLEXON control plane)  
**API:** `specs/api/transactional-email.md`  
**Knowledge:** `knowledge/transactional-email.md`  
**Parent:** Access Model B · `collection-invite-links.md` · `collection-members.md` (API)  
**Transport today:** `lib/send-password-reset-email.ts` (SMTP → Mailgun → log) — generalize in implementation wave P1

## Goal

One platform mailer in **PLEXON** sends transactional email over **SMTP** (normal relay). Capability apps (AUDION, CHECKION, BRANDION, CREATION, METRON, VIDEON) MUST NOT configure their own `SMTP_*` for auth or Collection team. They already mutate membership via Plexon provisioning; mail hooks fire there.

## Verdict from inventory (2026-09-21)

| Area | State |
|------|--------|
| Password reset | **Shipped** — `/forgot-password` → `POST /api/auth/request-password-reset` |
| Collection add-by-email | API + Team UI in six products — **no mail** |
| Collection invite mint | Returns `inviteUrl` / clipboard — **no mail** |
| Product share links / digests / KPI alerts | Clipboard or in-app only — **later** |
| Capability-app SMTP | **None** (correct) |

## Architecture

```
Capability Team UI ──► Plexon members/invites APIs ──► mailer ──► SMTP
Product login forgot ──► Plexon /forgot-password     ──► mailer ──► SMTP
```

1. **Single mailer** — SMTP-HTTP bridge first (`PLEXON_SMTP_HTTP_URL` + token), else direct SMTP (`PLEXON_SMTP_*` / `SMTP_*`), else Mailgun HTTP, else log (dev/staging).
2. **Hooks on Plexon mutations only** — apps do not send team mail themselves.
3. **Best-effort send** — membership / invite / reset token commit succeeds even if SMTP fails; log + health diagnostics.
4. **No secrets in products** — no `SMTP_*` in capability Coolify apps for this program.
5. **Deep links** — invite / member-added CTAs use absolute URLs when deliverability allows. Password-reset (and Mimecast-sensitive kinds) use pasteable codes / in-app instructions without `*.plygrnd.tech` URLs. HTML presentation uses the shared MSQDX email shell (`@msqdx/ui` `renderMsqdxEmailDocument`).

## Mail kinds

| Kind | Priority | Trigger | Recipient | Primary CTA |
|------|----------|---------|-----------|-------------|
| `password_reset` | **must** | Forgot-password request | Account email | pasteable code → `/reset-password` (no `*.plygrnd.tech` URL in body — Mimecast) |
| `collection_member_added` | **must** | `POST …/members` → `status: added` | Added user | Collection launch URL |
| `collection_invite` | **must** | `POST …/invites` with `toEmail` | `toEmail` | `/invite/{token}` |
| `password_changed` | should | Successful reset consume (or change-password) | Account email | Login |
| `account_welcome` | should | Admin onboards user (future invite-to-register) | New user | Login / set password |
| `collection_member_removed` | should | `DELETE …/members/:userId` | Removed user | — |

### Later (not Plexon Team; product-owned or shared helper)

- CREATION Client Page Share magic-link / OTP for `email_allowlist`
- CREATION guest-comment ping
- CHECKION job-complete / digests
- METRON KPI watches
- AUDION chat share-by-email
- CHECKION / METRON share-dialog email delivery

## Invariants

1. **Password reset anti-enumeration** — public API always returns the same success shape whether the email exists or not; never leak existence in the response body.
2. **Same company** — invite accept and add-by-email remain Access Model B (same company unless global admin). Mail does not relax ACL.
3. **Notify only on real grant** — `collection_member_added` ONLY when `status: added`, never on `already_member`.
4. **Invite mail optional** — create without `toEmail` still returns `inviteUrl` (clipboard flow unchanged).
5. **Token hygiene** — reset and invite tokens stay hashed at rest; plain token appears only in the outbound message / one-time create response.
6. **Fail open on transport** — SMTP/Mailgun failure MUST NOT roll back assignment or invite row; MUST log with kind + correlation id (no secrets).
7. **Capability apps** — Team BFFs remain thin proxies; they MAY forward `toEmail` on invite create once the API accepts it.
8. **Forgot-password parity** — product logins SHOULD deep-link to Plexon `/forgot-password` (Audion/Checkion/Brandion/Creation already; Videon + Metron gap called out in knowledge).

## Non-goals (v1 / this program)

- Marketing / newsletter / Listmonk campaigns  
- Coolify platform system notifications  
- Per-app SMTP stacks for auth or Collection team  
- Cross-company invites  
- MFA / magic-link login / OAuth email (greenfield)  
- AUDION journey-agent Gmail (inbound-only)

## Phases

| Phase | Scope | Exit |
|-------|--------|------|
| **P0** | This domain + API specs, knowledge, invite/members patches, inventory test | Specs accepted |
| **P1** | Generalize mailer (`lib/mail/`); wire `collection_member_added` + `collection_invite` (`toEmail`); extend health diagnostics beyond password-reset-only naming; mock-transport tests; Videon/Metron forgot-password deep-link parity | Staging SMTP delivers team + reset mail |
| **P2** | `password_changed`, `account_welcome` (register), `collection_member_removed` | Security/onboarding coverage |
| **P3+** | Product share/digest/alert kinds with preferences; CREATION magic-link via Plexon helper or shared send | Product async notify |

## Related

- Ops SMTP/Mailgun: `knowledge/coolify-env-variablen.md` · `knowledge/coolify-plexon-v3-env-cheatsheet.md`  
- Team ecosystem UI: `knowledge/collection-team-ecosystem.md`  
- Invite domain: `specs/domain/collection-invite-links.md`  
- Members API: `specs/api/collection-members.md`  
- Invites API: `specs/api/collection-invites.md`
