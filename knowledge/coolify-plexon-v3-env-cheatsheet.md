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

## 4. Explizit **nicht** setzen (Wave A — Control Plane only)

```text
CHECKION_DATABASE_URL
AUDION_DATABASE_URL
MIGRATION_MSQDX_PLATFORM_PROJECTS
ANTHROPIC_API_KEY                 # optional; Board / AI suggest später
```

Kein Prod-`PLEXON_SERVICE_SECRET`, keine Prod-`DATABASE_URL`.

---

## 4b. Wave B — Event Quick Check End-to-End (Staging)

Sobald **checkion-v3** und **audion-v3** laufen, auf **plexon-v3** setzen (sonst wirkt Quick Check „tot“):

```bash
NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech
CHECKION_API_URL=https://checkion-v3.projects-a.plygrnd.tech
CHECKION_API_TOKEN=checkion_<64-hex>

AUDION_API_URL=https://audion-v3.projects-a.plygrnd.tech/api
AUDION_API_TOKEN=audion_<hex>
```

Smoke: `knowledge/event-quick-check-staging-smoke.md` · Readiness: `GET /api/assistant/event-quick-check/readiness`

---

## 4c. Wave C — BRANDION v3 Registry deep-link

Sobald **brandion-v3** Staging-Smoke grün ist (`https://brandion-v3.projects-a.plygrnd.tech/api/health`), auf **plexon-v3** setzen:

```bash
NEXT_PUBLIC_BRANDION_URL=https://brandion-v3.projects-a.plygrnd.tech
```

Dann Redeploy plexon-v3. Wirkung:

- `getBrandionUrl()` / `getBrandionServiceApiUrl()` → Staging-FQDN
- Products Registry: BRANDION `lifecycle: active` (sonst `planned`)
- Deep-Links: home `/`, projects `/projects`, login `/login`, health `/api/health`
- Collection create / sync upserts BRANDION mirrors via `PUT {BRANDION}/api/platform/provisioning/projects/{id}`
- Product-first: `POST /api/platform/provisioning/brandion-project-origin`

Auf **brandion-v3** für Live-Origin + durable mirrors zusätzlich:

```bash
BRANDION_FEDERATION_MODE=live
DATABASE_URL=<Postgres — strongly recommended>
```

(bereits `PLEXON_SERVICE_SECRET` + Plexon Auth URLs vom Shell-Attach)

Collection Dashboard Parity (2026-08-09): plexon BFF `fetchBrandionPlatformProjectSummary` + launch `{BRANDION}/projects?platformProjectId=`. KP facet `brand` remains reserved. See `brandion-v3/knowledge/plexon-dashboard-parity.md`.

**Nie** Prod-`brandion` Coolify-URL hier eintragen.

Brandion-App Env + Attach: `brandion-v3/knowledge/staging-coolify.md` · Operator: `brandion-v3/knowledge/coolify-operator-handoff.md`.

Optional Shared Variable:

| Shared Name | Wert |
|-------------|------|
| `V3_BRANDION_PUBLIC_URL` | `https://brandion-v3.projects-a.plygrnd.tech` |

```bash
NEXT_PUBLIC_BRANDION_URL={{environment.V3_BRANDION_PUBLIC_URL}}
```

---

## 4d. Wave D — CREATION v3 Registry deep-link

Sobald **creation-v3** Staging-Smoke grün ist (`https://creation-v3.projects-a.plygrnd.tech/api/health`), auf **plexon-v3** setzen:

```bash
NEXT_PUBLIC_CREATION_URL=https://creation-v3.projects-a.plygrnd.tech
```

Dann Redeploy plexon-v3. Wirkung:

- `getCreationUrl()` → Staging-FQDN
- Products Registry: CREATION `lifecycle: active` (sonst `planned`)
- Deep-Links: home `/`, projects `/projects`, login `/login`, health `/api/health`
- Collection binding / upsert: Wave 3 landed — `creation` in placeholders; upsert when URL set; origin `creation-project-origin`. See `knowledge/creation-v3-onboarding.md`.

Auf **creation-v3** für Auth + Assistant:

```bash
CREATION_FEDERATION_MODE=dummy   # live later with provisioning
NEXT_PUBLIC_PLEXON_URL=<plexon public>
PLEXON_AUTH_URL=<plexon>
PLEXON_SERVICE_SECRET=<shared>
AUTH_SECRET=<≥32>
```

**Nie** Prod-URL hier eintragen ohne Staging-Smoke.

Optional Shared Variable:

| Shared Name | Wert |
|-------------|------|
| `V3_CREATION_PUBLIC_URL` | `https://creation-v3.projects-a.plygrnd.tech` |

```bash
NEXT_PUBLIC_CREATION_URL={{environment.V3_CREATION_PUBLIC_URL}}
```

---

## 4e. Wave E — SPIRION Registry deep-link

Sobald **SPIRION** Staging-Smoke grün ist (`https://dig.projects-a.plygrnd.tech/api/health` — FQDN still `dig.*` until infra rename), auf **plexon-v3** setzen:

```bash
NEXT_PUBLIC_SPIRION_URL=https://dig.projects-a.plygrnd.tech
# optional service upsert base (defaults to public URL):
# SPIRION_API_URL=https://dig-api.projects-a.plygrnd.tech
# Legacy aliases still work for one release:
# NEXT_PUBLIC_DIG_URL=… / DIG_API_URL=…
```

Dann Redeploy plexon-v3. Wirkung:

- `getSpirionUrl()` / `getSpirionServiceApiUrl()` → Staging-FQDN (`getDigUrl` / `getDigServiceApiUrl` are thin aliases)
- Products Registry: SPIRION `lifecycle: active` (sonst `planned`)
- Collection binding / upsert: product id `spirion` in placeholders; upsert when URL set; origin `spirion-project-origin` (legacy `dig-project-origin` forwards)
- Capability catalog stubs: `spirion.capture`, `spirion.enrich`, `spirion.reference_search`, `spirion.reference_pack`, `spirion.generate`
- Existing DB rows with `product_id='dig'` need: `UPDATE platform_project_product_bindings SET product_id='spirion' WHERE product_id='dig';` (see `lib/db/migrations/0008_rename_dig_to_spirion.sql`)

**Nie** Prod-URL hier eintragen ohne Staging-Smoke.

Optional Shared Variable:

| Shared Name | Wert |
|-------------|------|
| `V3_SPIRION_PUBLIC_URL` | `https://dig.projects-a.plygrnd.tech` |
| `V3_DIG_PUBLIC_URL` | legacy alias — prefer `V3_SPIRION_PUBLIC_URL` |

```bash
NEXT_PUBLIC_SPIRION_URL={{environment.V3_SPIRION_PUBLIC_URL}}
# or legacy:
# NEXT_PUBLIC_DIG_URL={{environment.V3_DIG_PUBLIC_URL}}
```

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
