# Transactional email — ops & inventory

**Status:** 2026-09-21  
**Specs:** `specs/domain/transactional-email.md` · `specs/api/transactional-email.md`  
**Coolify SMTP detail:** `knowledge/coolify-env-variablen.md` (password-reset section; same transport for all kinds)  
**Cheatsheet:** `knowledge/coolify-plexon-v3-env-cheatsheet.md` §5 (`mail.plygrnd.tech`)

## Rule

**Plexon sends.** Capability apps (Audion, Checkion, Brandion, Creation, Metron, Videon) MUST NOT add `SMTP_*` / Mailgun keys for Collection team or auth. Team panels call provisioning; mail fires inside Plexon.

## Staging SMTP (2026-09-21)

| Item | Value |
|------|--------|
| Host | `mail.plygrnd.tech` |
| STARTTLS | Port `587` (Coolify: `SMTP_PORT=587`) |
| SMTPS | Port `465` + `SMTP_SECURE=true` |
| User | `info@plygrnd.tech` |
| From | `PLEXON <noreply@plygrnd.tech>` (`PLEXON_PASSWORD_RESET_FROM_EMAIL` / `PLEXON_SMTP_FROM`) |
| Password | Coolify `SMTP_PASSWORD` only — never commit |

Env keys: `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASSWORD` · From as above. Cheatsheet §5.

### Incident 2026-09-21 — forgot-password no inbox

**Symptom:** UI returns ok (anti-enumeration); no mail arrives.  
**Plexon logs:** `[PLEXON] transactional mail failed kind=password_reset: Error: Connection timeout` (`ETIMEDOUT`, `command: CONN`). Same for `collection_member_added`.  
**Health:** `transactionalMail.transport=smtp`, `smtpHostSet=true` — env is fine; **TCP never reaches the MTA**.

**Root cause:** `docker-mailserver` runs on the **Coolify host** (`mail.plygrnd.tech` → `89.58.35.209`). Roundcube HTTPS (80/443) works via Traefik. **SMTP/IMAP ports 25/465/587/993 are not reachable** from outside (host firewall). Plexon on **projects-01** therefore cannot submit on TCP 587.

**Fix shipped (2026-09-21) — HTTPS SMTP bridge (no firewall change):**

| Item | Value |
|------|--------|
| Coolify service | `plexon-smtp-http-bridge` (`90fzj0soeu4ruawzq4l3xanx`) on **coolify** host |
| Public URL | `https://smtp_http_bridge-90fzj0soeu4ruawzq4l3xanx.plygrnd.tech` (`/health`, `POST /send`) |
| Delivery mode (updated evening) | **Direct MX** — bridge resolves recipient MX (DoH) and submits on TCP **25** from `89.58.35.209` (`HELO mail.plygrnd.tech`). Local Postfix submission accepted mail but did **not** reliably deliver outbound. |
| Plexon env | `PLEXON_SMTP_HTTP_URL` · `PLEXON_SMTP_HTTP_TOKEN` · `PLEXON_SMTP_HTTP_INSECURE_TLS=1` |
| Transport | Health `transactionalMail.transport=smtp_http` |

**Delivery notes (2026-09-21 evening):**

- `bordeck.christoph@gmail.com`: Gmail MX accepts from `89.58.35.209` (probe + direct DATA ok). Prefer spam folder if not in inbox.
- `christoph.bordeck@msqdx.com`: Mimecast MX — plain/test bodies deliver; short **password-reset** bodies were rejected with **554 security policies** (`DOC-1369#554`) and intermittent **451**. Softened multipart templates (`PLEXON: Link für dein Konto`) + text/plain. Still allowlist sending IP `89.58.35.209` / `plygrnd.tech` in Mimecast if resets stay flaky.
- SPF for `plygrnd.tech` is `v=spf1 mx ~all` (softfail). Hardening (DKIM/DMARC + `ip4:89.58.35.209` in SPF) still recommended.

Ops alternative still valid: open host firewall TCP **587** from projects-01 and repair Postfix outbound; or use Mailgun as transport 3.

## Code today (P1)

| Path | Role |
|------|------|
| `lib/mail/` | Shared transport + `sendTransactionalEmail` + templates |
| `lib/send-password-reset-email.ts` | Thin facade → `password_reset` kind |
| `lib/collection-members.ts` | On `added` → `collection_member_added` |
| `lib/collection-invites.ts` | Optional `toEmail` → `collection_invite` |
| `app/forgot-password` · reset routes | UI + token |
| Health | `passwordResetMail` **and** `transactionalMail` (same diagnostics) |

## Product inventory

Team UI may forward draft email as invite `toEmail` — see `knowledge/invite-toemail-team-ui.md`.

| App | Team BFF | Forgot → Plexon | Own SMTP? |
|-----|----------|-----------------|-----------|
| Audion | `/api/projects/:id/members\|invites` | Yes (`plexon-links`) | No |
| Checkion | same | Yes | No |
| Brandion | same | Yes | No |
| Creation | same + scene share-invite | Yes | No |
| Metron | same | Yes (`plexon-links`) | No |
| Videon | `/api/collections/:id/members\|invites` | Yes (`plexon-links` + `NEXT_PUBLIC_PLEXON_URL`) | No |

Ecosystem Team UI list: `knowledge/collection-team-ecosystem.md`.

## Later product kinds (not P0)

- Creation `email_allowlist` magic-link/OTP  
- Checkion job-complete / share email  
- Metron KPI watches / dashboard share email  
- Audion chat share-by-email  

## P1 implementation sketch

1. Extract shared transport from `send-password-reset-email.ts` → `lib/mail/` (or equivalent).  
2. Templates per kind (plain text + simple HTML).  
3. Hook `addCollectionMemberByEmail` when `added`; hook invite create when `toEmail`.  
4. Tests with mocked transport.  
5. Add Videon/Metron `getPlexonForgotPasswordUrl` on login (UI only).
