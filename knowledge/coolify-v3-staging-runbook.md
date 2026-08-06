# Coolify Runbook — `msqdx-v3-staging` + plexon-v3

**Status:** Runbook 2026-07-30  
**Policy:** `knowledge/ecosystem-v3-parallel-track.md`  
**Prod-Freeze:** bestehendes v2 Coolify-Projekt **nicht** anfassen  
**Pilot-Product:** AUDION-v3 → `audion-v3/knowledge/plexon-federation.md`  
**plexon-v3 Copy-Paste Env:** `knowledge/coolify-plexon-v3-env-cheatsheet.md`

Dieses Dokument ist die operative Anleitung für die **v3-Parallelinsel**. Platzhalter-URLs unten zentral pflegen — nicht in App-Code hardcoden.

---

## 0. Zentrale Platzhalter (Staging plygrnd — 2026-07-30)

| Key | Wert |
|-----|------|
| `DOMAIN_ROOT` | `projects-a.plygrnd.tech` |
| `URL_PLEXON_V3` | `https://plexon-v3.projects-a.plygrnd.tech` |
| `URL_AUDION_V3` | `https://audion-v3.projects-a.plygrnd.tech` |
| `URL_CHECKION_V3` | `https://checkion-v3.projects-a.plygrnd.tech` |
| `URL_ECHON_V3` | `https://echon-v3.projects-a.plygrnd.tech` (später) |
| GitHub `REPO_AUDION_V3` | `audion-v3` Repo |
| Branch AUDION-v3 | `main` |

AUDION detail: `audion-v3/knowledge/deploy-urls.md`

**Regel:** Prod-URLs ohne `-v3` nie als Ziel für diese Insel verwenden.

---

## 1. Coolify-Hierarchie (Soll)

```
Team: msqdx
└── Project: msqdx-ecosystem-v3          ← NEU (nicht Prod-Projekt)
    └── Environment: staging             ← Name in Coolify: staging
        ├── DB: plexon-v3-postgres
        ├── App: plexon-v3
        ├── App: audion-v3-web           ← Phase 1b
        ├── App: checkion-v3             ← Wave B (fixtures Staging Shell)
        └── (later) echon-v3-…
```

Optional parallel:

```
Project: msqdx-ecosystem-prod-v2         ← bestehend, Freeze
└── Environment: production
    └── … unverändert …
```

### Warum eigenes Project?

- Getrenntes Docker-Netz → keine versehentlichen Service-DNS-Treffer auf v2  
- Environment-Shared-Variables (`{{environment.*}}`) nur für v3-Secrets  
- Klare Rechte / Übersicht fürs Team  

Wenn Coolify bereits „ein Project mit zwei Environments“ bevorzugt: **nur dann** Environment `v3-staging` **im selben Project** anlegen — trotzdem **eigene** Postgres + **eigene** Domains + **keine** Shared `DATABASE_URL` mit production.

---

## 2. Deploy-Reihenfolge (Wave A)

| Step | Resource | Abhängigkeit | Done? |
|------|----------|--------------|-------|
| A1 | Coolify Project `msqdx-ecosystem-v3` + Env `staging` | — | ☐ |
| A2 | PostgreSQL `plexon-v3-postgres` (eigene DB, eigener Volume) | A1 | ☐ |
| A3 | Application `plexon-v3` (Dockerfile aus **`chbrdk/plexon-v3`**) | A2 | ☐ |
| A4 | Domain + TLS → `URL_PLEXON_V3` | A3 | ☐ |
| A5 | Env-Matrix plexon-v3 setzen + Redeploy | A3–A4 | ☐ |
| A6 | Smoke plexon-v3 (`/api/health`, Login, Register) | A5 | ☐ |
| A7 | Application `audion-v3-web` (**braucht Dockerfile** — siehe §6) | A6 | ☐ |
| A8 | Domain + TLS → `URL_AUDION_V3` | A7 | ☐ |
| A9 | Env-Matrix audion-v3 + Redeploy | A7–A8 | ☐ |
| A10 | Federation-Smoke (Login AUDION → Plexon, Settings, Project Origin) | A9 | ☐ |

**Nicht** in Wave A: Prod-MCP, Prod-CHECKION/AUDION-API-Tokens, `MIGRATION_MSQDX_PLATFORM_PROJECTS`, Cross-DB-URLs auf v2.

---

## 3. Environment-Shared-Variables (Coolify Env `staging`)

In Coolify: Project → Environment `staging` → Shared Variables.  
Apps referenzieren mit `{{environment.NAME}}`.

| Name | Generierung | Verwendung |
|------|-------------|------------|
| `V3_PLEXON_SERVICE_SECRET` | `openssl rand -hex 24` (≥16 chars) | plexon-v3 + alle v3-Products |
| `V3_AUTH_SECRET_PLEXON` | `openssl rand -hex 32` (≥32) | nur plexon-v3 `AUTH_SECRET` |
| `V3_AUTH_SECRET_AUDION` | `openssl rand -hex 32` (≥32) | nur audion-v3 `AUTH_SECRET` |
| `V3_PLEXON_PUBLIC_URL` | = `URL_PLEXON_V3` | `NEXTAUTH_URL` / Product `PLEXON_AUTH_URL` |
| `V3_AUDION_PUBLIC_URL` | = `URL_AUDION_V3` | plexon Registry / Deep Links |

**Nie** Prod-`PLEXON_SERVICE_SECRET` wiederverwenden.

---

## 4. Env-Matrix — `plexon-v3`

Quelle: `PLEXON/.env.example` + `knowledge/coolify-env-variablen.md` (nur v3-relevante Submenge).

### 4.1 Pflicht (MVP Control Plane)

| Variable | Wert / Hinweis |
|----------|----------------|
| `AUTH_SECRET` | `{{environment.V3_AUTH_SECRET_PLEXON}}` |
| `DATABASE_URL` | Coolify Internal URL von `plexon-v3-postgres` (nicht v2-DB) |
| `NEXTAUTH_URL` | `{{environment.V3_PLEXON_PUBLIC_URL}}` (exakt, inkl. https, ohne trailing slash außer bewusst) |
| `PUBLIC_APP_URL` | gleich wie `NEXTAUTH_URL` (Reset-Links) |
| `PLEXON_SERVICE_SECRET` | `{{environment.V3_PLEXON_SERVICE_SECRET}}` |

### 4.2 Empfohlen Staging

| Variable | Wert / Hinweis |
|----------|----------------|
| `PLEXON_ADMIN_EMAIL` | interne Admin-Mail für ersten Admin-Login |
| `PLEXON_DEMO_EMAIL` / `PLEXON_DEMO_PASSWORD` | nur wenn **ohne** echte User-DB getestet wird — mit `DATABASE_URL` eher weglassen |
| Passwort-Reset | Staging: **Mailpit**-App im gleichen Env **oder** Mailgun Sandbox — siehe Prod-Doku, eigene Keys |
| `ANTHROPIC_API_KEY` | optional in Wave A; Board/Assistant erst wenn nötig |

### 4.3 Explizit **nicht** setzen (Wave A)

| Variable | Warum |
|----------|--------|
| `CHECKION_DATABASE_URL` / `AUDION_DATABASE_URL` | würden auf v2 zeigen oder fehlen — kein Cross-Env |
| `MIGRATION_MSQDX_PLATFORM_PROJECTS` | einmalig, nie auto auf Staging-Blank |
| `CHECKION_API_URL` / `AUDION_API_URL` + Tokens | erst wenn v3-Product-APIs existieren |
| `NEXT_PUBLIC_AUDION_ADMIN_URL` / `NEXT_PUBLIC_CHECKION_URL` | Wave A: nicht setzen (oder nur wenn Product-App schon da). **Wave B:** nach checkion-v3 smoke auf `URL_CHECKION_V3` (`https://checkion-v3.projects-a.plygrnd.tech`) setzen — Registry / Collection deep-links auf v3, nie Prod-CHECKION |
| `NEXT_PUBLIC_BRANDION_URL` | Wave A/B: leer lassen → BRANDION bleibt `planned`. **Wave C:** nach brandion-v3 smoke auf `URL_BRANDION_V3` (`https://brandion-v3.projects-a.plygrnd.tech`) — nie Prod-`brandion` |

### 4.4 Build (Dockerfile)

- Repo: `REPO_PLEXON_V3` = `chbrdk/plexon-v3` (Prod bleibt `chbrdk/PLEXON`), Dockerfile root `Dockerfile`
- Port: **3000**
- Build-Args bei Bedarf: `DESIGN_SYSTEM_REPO`, `DESIGN_SYSTEM_BRANCH` (wie Prod, aber unabhängig deployen)
- Health: `GET {URL_PLEXON_V3}/api/health`

---

## 5. Env-Matrix — `audion-v3-web`

Quelle: `audion-v3/.env.example` + `audion-v3/knowledge/plexon-federation.md`.

| Variable | Wert / Hinweis |
|----------|----------------|
| `AUTH_SECRET` | `{{environment.V3_AUTH_SECRET_AUDION}}` |
| `PLEXON_AUTH_URL` | `{{environment.V3_PLEXON_PUBLIC_URL}}` |
| `PLEXON_SERVICE_SECRET` | `{{environment.V3_PLEXON_SERVICE_SECRET}}` (identisch zu plexon-v3) |
| `NEXT_PUBLIC_PLEXON_REGISTER_URL` | `{URL_PLEXON_V3}/register` |
| `PORT` | Container-Port laut Dockerfile (lokal 3006; Image ggf. 3000 — im Coolify Port-Mapping angleichen) |
| `NEXT_PERSONA_DATA_SOURCE` | Wave A: **`fixtures`** (keine Prod-API) |

Contract-Header: Product sendet `X-Plexon-Contract-Version: 2026-05-plexon-federation-v3`.

### Smoke nach A10

1. Öffne `URL_AUDION_V3` → Redirect Login (weil Plexon konfiguriert)  
2. Login mit User aus plexon-v3  
3. Settings → Account → Email + Sign out  
4. Project create → Origin-Call (Log ok oder graceful skip)  
5. Chat → optional Usage-Event (kein Blocker)

---

## 6. Blocker / Vorarbeit Code

| Item | Status | Action |
|------|--------|--------|
| PLEXON Dockerfile | vorhanden | Coolify Nixpacks **nicht** nötig |
| audion-v3 Dockerfile | **vorhanden** (`audion-v3/Dockerfile`) | Coolify: Dockerfile root, Port 3000, Domain `audion-v3.projects-a.plygrnd.tech` |
| Platform Registry Deep Links | Prod-Defaults in `lib/constants.ts` | auf plexon-v3 Env `NEXT_PUBLIC_AUDION_ADMIN_URL={URL_AUDION_V3}` setzen |
| Contract-Doku PLEXON | v2 SoT | v3 parallel — siehe `ecosystem-v3-parallel-track.md` |

---

## 7. Network & Secrets Checkliste

- [ ] `plexon-v3-postgres` Volume **neu** (kein Restore von Prod ohne bewussten Dump)  
- [ ] Interner Hostname nur innerhalb Env `staging`  
- [ ] Traefik/Domain nur `*-v3.*` Hosts  
- [ ] Git Deploy Hook nur auf v3-Repos / v3-Branches  
- [ ] Team-Regel: PRs nach Prod-v2 dürfen keine `URL_*_V3`-Defaults überschreiben  

---

## 8. Smoke plexon-v3 (A6 Detail)

```bash
# von außen
curl -fsS "$URL_PLEXON_V3/api/health" | jq .
# erwartet: ok / passwordResetMail-Felder ohne Secret-Leak
```

UI:

1. Register oder Admin-Login (`PLEXON_ADMIN_EMAIL`)  
2. Dashboard lädt  
3. `POST /api/auth/validate-credentials` mit Service-Secret (von AUDION-Seite später)

---

## 9. Nächste Wellen (kurz)

| Wave | Inhalt |
|------|--------|
| B | checkion-v3 + echon-v3 Apps in **dieselbe** Env; gleiche `V3_PLEXON_SERVICE_SECRET` |
| C | Product-Postgres je Service; Import-Jobs aus v2 nur Copy |
| Cutover | DNS/Flag **pro** Product — siehe `ecosystem-v3-parallel-track.md` |

---

## 10. Verweise

| Doc | Pfad |
|-----|------|
| Ökosystem-Policy | `knowledge/ecosystem-v3-parallel-track.md` |
| PLEXON Env (Prod-Referenz) | `knowledge/coolify-env-variablen.md` |
| AUDION Trennung | `audion-v3/knowledge/v2-v3-runtime-separation.md` |
| AUDION Federation | `audion-v3/knowledge/plexon-federation.md` |
| PLEXON `.env.example` | `PLEXON/.env.example` |
| AUDION-v3 `.env.example` | `audion-v3/.env.example` |
