# plexon-v3 — Coolify Env Cheat-Sheet (Copy-Paste)

**Date:** 2026-07-30  
**Domain:** `https://plexon-v3.projects-a.plygrnd.tech`  
**Companion:** `https://audion-v3.projects-a.plygrnd.tech`  
**Full runbook:** `knowledge/coolify-v3-staging-runbook.md`  
**Prod:** nicht anfassen — nur Project `msqdx-ecosystem-v3` / Env `staging`  
**GitHub (v3):** `https://github.com/chbrdk/plexon-v3` — Coolify Source **nicht** `PLEXON`  
**Switch-Checkliste:** `knowledge/coolify-switch-to-plexon-v3-repo.md`  
**Smoke A6/A10:** `knowledge/federation-smoke-a6-a10.md`

---

## 1. Coolify App-Settings

| Feld | Wert |
|------|------|
| Name | `plexon-v3` |
| Repo | **`plexon-v3`** (`chbrdk/plexon-v3`) — nicht Prod-`PLEXON` |
| Branch | `main` |
| Build Pack | **Dockerfile** |
| Dockerfile location | `/Dockerfile` |
| Port | `3000` |
| Domain | `plexon-v3.projects-a.plygrnd.tech` |
| Healthcheck path | `/api/health` |
| Postgres | **neu:** `plexon-v3-postgres` (eigener Volume — kein Prod-Restore) |

---

## 2. Secrets einmal generieren (lokal)

```bash
# ≥32 chars — nur plexon-v3 AUTH_SECRET
openssl rand -hex 32

# ≥16 chars — shared mit audion-v3 (und späteren v3-Products)
openssl rand -hex 24

# ≥32 chars — später für audion-v3 (jetzt schon erzeugen und notieren)
openssl rand -hex 32
```

Optional als Coolify **Environment Shared Variables** (`staging`):

| Shared Name | Wert |
|-------------|------|
| `V3_AUTH_SECRET_PLEXON` | Output von Secret #1 |
| `V3_PLEXON_SERVICE_SECRET` | Output von Secret #2 |
| `V3_AUTH_SECRET_AUDION` | Output von Secret #3 (für später) |
| `V3_PLEXON_PUBLIC_URL` | `https://plexon-v3.projects-a.plygrnd.tech` |
| `V3_AUDION_PUBLIC_URL` | `https://audion-v3.projects-a.plygrnd.tech` |

---

## 3. Runtime Env — Copy-Paste Block (plexon-v3)

In Coolify → Application `plexon-v3` → Environment Variables (**Runtime**, nicht nur Build).

`DATABASE_URL` aus der Coolify-Postgres-Resource übernehmen (**Internal URL**, Runtime).
Host darf **nicht** `base` / `localhost` sein — siehe `knowledge/register-enotfound-base-2026-07-30.md`.

```bash
# --- Pflicht ---
AUTH_SECRET={{environment.V3_AUTH_SECRET_PLEXON}}
DATABASE_URL=<COOLIFY_INTERNAL_URL_VON_plexon-v3-postgres>
NEXTAUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PUBLIC_APP_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET={{environment.V3_PLEXON_SERVICE_SECRET}}
PORT=3000

# --- Empfohlen Staging ---
PLEXON_ADMIN_EMAIL=<deine-admin@firma.tld>

# Deep Links + Collection-Sync Ziel (Federation nutzt diese Origin, nicht AUDION_API_URL)
NEXT_PUBLIC_AUDION_ADMIN_URL=https://audion-v3.projects-a.plygrnd.tech/
```

**Collection-Sync (AUDION):** `PLEXON_SERVICE_SECRET` muss **identisch** zu Audion-v3 sein. Sync ruft
`{NEXT_PUBLIC_AUDION_ADMIN_URL-Origin}/api/platform/provisioning/projects/{id}` auf.
`AUDION_API_URL` (FastAPI) wird dafür **nicht** verwendet — absichtlich nicht setzen (siehe §4).

Wenn Coolify Shared Variables nicht nutzt: Secrets **direkt** einfügen (nicht `{{environment.…}}`).

### Literal-Variante (ohne Shared Vars)

```bash
AUTH_SECRET=<paste-openssl-32-hex>
DATABASE_URL=postgresql://USER:PASSWORD@plexon-v3-postgres:5432/plexon
NEXTAUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PUBLIC_APP_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET=<paste-openssl-24-hex>
PORT=3000
PLEXON_ADMIN_EMAIL=<deine-admin@firma.tld>
NEXT_PUBLIC_AUDION_ADMIN_URL=https://audion-v3.projects-a.plygrnd.tech/
```

---

## 4. Explizit **nicht** setzen (Wave A)

```text
CHECKION_DATABASE_URL
AUDION_DATABASE_URL
MIGRATION_MSQDX_PLATFORM_PROJECTS
CHECKION_API_URL
CHECKION_API_TOKEN
AUDION_API_URL
AUDION_API_TOKEN
NEXT_PUBLIC_CHECKION_URL          # Prod-URL — erst wenn checkion-v3 existiert
ANTHROPIC_API_KEY                 # optional; Board später
```

Kein Prod-`PLEXON_SERVICE_SECRET`, keine Prod-`DATABASE_URL`.

---

## 5. Passwort-Reset (Staging, optional)

**Einfach:** nichts setzen → Reset-Link nur in Container-Logs.

**Mailpit** (empfohlen Staging): eigene App im gleichen Env, dann:

```bash
SMTP_HOST=<coolify-internal-hostname-mailpit>
SMTP_PORT=1025
PLEXON_PASSWORD_RESET_FROM_EMAIL=PLEXON <noreply@projects-a.plygrnd.tech>
```

**Mailgun:** nur mit **eigenen** Staging-Keys — siehe `knowledge/coolify-env-variablen.md`.

---

## 6. Deploy-Checkliste

1. [ ] Project `msqdx-ecosystem-v3` + Env `staging`  
2. [ ] DB `plexon-v3-postgres` erstellt  
3. [ ] App `plexon-v3` + Domain + TLS  
4. [ ] Env gesetzt → **Redeploy**  
5. [ ] `curl -fsS https://plexon-v3.projects-a.plygrnd.tech/api/health`  
6. [ ] Browser: Register oder Login mit `PLEXON_ADMIN_EMAIL`  
7. [ ] Secret #2 notieren → später identisch in audion-v3  

---

## 7. Danach: audion-v3 (Kurzvorschau)

```bash
AUTH_SECRET={{environment.V3_AUTH_SECRET_AUDION}}
PLEXON_AUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET={{environment.V3_PLEXON_SERVICE_SECRET}}
NEXT_PUBLIC_PLEXON_REGISTER_URL=https://plexon-v3.projects-a.plygrnd.tech/register
NEXT_PERSONA_DATA_SOURCE=fixtures
PORT=3000
```

Detail: `audion-v3/knowledge/deploy-urls.md`
