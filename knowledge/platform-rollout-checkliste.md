# PLEXON Plattform – Rollout-Checkliste

Diese Checkliste fasst den **aktuellen Umsetzungsstand** (Federation, Entitlements, Provisioning, Shared Projects in CHECKION) und die **operativen Verifikationsschritte** zusammen. Pfade und Variablennamen sind an den Code angelehnt; produktive Werte bitte aus eurer Coolify-/Runtime-Konfiguration übernehmen.

## 1. Bereits umgesetzt (Kurzüberblick)

| Bereich | Inhalt |
|--------|--------|
| **Federation** | Gemeinsamer Plattform-Vertrag, Return-Links, Launch-Context, Runtime-/Deploy-Metadaten |
| **PLEXON** | Entitlements, Launch-Payload, Provisioning-Telemetrie, Admin-UI inkl. **projectAssignments** (AUDION + CHECKION), Retry/Resync |
| **CHECKION** | Provisioning-Endpoint, lokale Mitgliedschaften, owner-backed Shared Projects (Reads/Writes/Listen/Search/Share), Legacy `GET /api/scans` inkl. Shared Visibility |
| **AUDION-v2** | Provisioning + `platform_managed_project_memberships` (Repo-Stand; Live-Routing ggf. separat prüfen) |

Detaillierte technische Notizen liegen u. a. in:

- `PLEXON/knowledge/platform-provisioning-rollout.md`
- `PLEXON/knowledge/platform-provisioning-membership-sync.md`
- `CHECKION/knowledge/checkion-platform-project-memberships.md`

## 2. Zentrale Code-Referenzen (keine Hardcodes im Kopf)

| Thema | Wo nachschlagen |
|--------|------------------|
| Öffentliche Produkt-URLs (Defaults + Env) | `PLEXON/lib/constants.ts` – `getCheckionUrl()`, `getAudionAdminUrl()`, `getAudionServiceApiUrl()`, `getCheckionServiceApiUrl()` |
| Admin-API-Pfade (User, Entitlements, Provisioning) | `PLEXON/lib/constants.ts` – `apiAdminUser`, `apiAdminUserEntitlements`, `apiAdminUserProvisioning` |
| CHECKION API-Basis (Subpath-sicher) | `CHECKION/lib/constants.ts` – `APP_BASE_URL`, `API_HEALTH`, `API_SCAN`, `API_SCANS_DOMAIN`, … |
| CHECKION → PLEXON Auth & Usage | `CHECKION/lib/plexon-auth.ts`, `CHECKION/lib/usage-report.ts` |

## 3. Umgebungsvariablen – PLEXON

**Pflicht / Basis (laut README und `auth.ts`):**

| Variable | Zweck |
|----------|--------|
| `AUTH_SECRET` | NextAuth, min. 32 Zeichen in Production |
| `DATABASE_URL` | PostgreSQL (User, Entitlements, Provisioning, …) |
| `NEXTAUTH_URL` | Exakte öffentliche Basis-URL der PLEXON-App |

**Produkt-URLs & Server-zu-Server:**

| Variable | Zweck |
|----------|--------|
| `NEXT_PUBLIC_CHECKION_URL` | Link-Ziel / Default für CHECKION (siehe `getCheckionUrl()`) |
| `NEXT_PUBLIC_AUDION_ADMIN_URL` | Link-Ziel AUDION Admin (siehe `getAudionAdminUrl()`) |
| `CHECKION_API_URL` | Optional: Basis für Outbound-Calls zu CHECKION, Fallback `getCheckionUrl()` |
| `AUDION_API_URL` | Optional: AUDION-API-Basis für Provisioning-Fanout, Fallback aus Admin-URL |
| `NEXT_PUBLIC_VIDEON_URL` / `NEXT_PUBLIC_BRANDION_URL` | Optional, Teaser/Registry |

**Secrets & Board:**

| Variable | Zweck |
|----------|--------|
| `PLEXON_SERVICE_SECRET` | Service-zu-Service (z. B. `POST /api/services/usage/events`, Validate-Credentials) |
| `CHECKION_MCP_URL` oder `MCP_SERVER_URL` | CHECKION MCP für Board |
| `AUDION_MCP_URL` | AUDION MCP für Board |
| `ANTHROPIC_BOARD_MODEL` | Optional Override für Board-Completion |

## 4. Umgebungsvariablen – CHECKION

**App & Pfade:**

| Variable | Zweck |
|----------|--------|
| `NEXT_PUBLIC_APP_BASE_URL` / `BASE_PATH` | Subpath-Deployments; siehe `CHECKION/lib/constants.ts` |
| `AUTH_SECRET` | Session (min. Länge beachten, vgl. Build-Warnungen) |
| `NEXTAUTH_URL` | Öffentliche CHECKION-URL |

**Federation / PLEXON:**

| Variable | Zweck |
|----------|--------|
| `PLEXON_AUTH_URL` | Basis-URL PLEXON für zentrale Auth (`/api/auth/validate-credentials`) |
| `PLEXON_SERVICE_SECRET` | Gleiches Secret wie in PLEXON für Contract-Header und Service-Calls |
| `NEXT_PUBLIC_PLEXON_REGISTER_URL` | Origin-Whitelist für `plexon_return_to` (siehe Tests unter `__tests__/lib/plexon-links.test.ts`) |

**Provisioning (Inbound von PLEXON):**

| Variable | Zweck |
|----------|--------|
| `PLEXON_SERVICE_SECRET` | Bearer/Header-Validierung am Endpoint `PUT /api/platform/provisioning/users/[id]` |

Weitere produktspezifische Variablen: siehe bestehende Knowledge (`CHECKION/knowledge/plexon-federation.md`, Coolify-Dokus).

## 5. Umgebungsvariablen – AUDION-v2 (API)

Analog zu CHECKION: gemeinsames `PLEXON_SERVICE_SECRET`, Provisioning-Route unter FastAPI (siehe Repo `AUDION-v2`), exakte öffentliche API-URL in Coolify/Proxy setzen (`AUDION_API_URL` in PLEXON muss erreichbar sein).

## 6. Smoke-Checks nach Deploy (Reihenfolge)

### 6.1 PLEXON

1. `GET {NEXTAUTH_URL}/api/health` – Status + Runtime-Metadaten inkl. Federation-Version
2. Als Admin: User-Liste und **Entitlements** inkl. **projectAssignments** für `checkion` / `audion`
3. **Provisioning**: nach Entitlement-Änderung Status prüfen; bei Bedarf `POST …/api/admin/users/{id}/provisioning` (Retry/Resync)

### 6.2 CHECKION

1. `GET {CHECKION_BASE}/api/health`
2. Login mit gleichen Credentials wie PLEXON (wenn `PLEXON_AUTH_URL` aktiv)
3. Login/Register: Return-Link zu PLEXON sichtbar, wenn Query/Storage gesetzt (`plexon_return_to`, etc.)
4. **Provisioning** (nur mit gültigem Service-Secret): `PUT {CHECKION_BASE}/api/platform/provisioning/users/{plexonUserId}` – erwartet idempotentes Verhalten
5. **Shared Project** (manuell): Nutzer A Owner, Nutzer B als Member über PLEXON zuweisen → B sieht owner-backed Listen (`GET /api/scan`, `GET /api/scans/domain`), Search, Share, GEO-/Journey-History ohne `projectId`

### 6.3 AUDION

1. API-Health über die in PLEXON konfigurierte `AUDION_API_URL`
2. Provisioning-Endpoint wie in PLEXON-Fanout konfiguriert – bei 404/Proxy zuerst Routing prüfen, nicht nur Code

## 7. Bekannte Stolpersteine

- **`AUTH_SECRET` zu kurz**: Build/Runtime-Warnungen bei PLEXON und CHECKION
- **Subpath**: `NEXT_PUBLIC_APP_BASE_URL` und `BASE_PATH` in CHECKION konsistent halten
- **AUDION öffentlich vs. intern**: PLEXON `AUDION_API_URL` muss vom PLEXON-Container aus erreichbar sein (oft interne Service-URL)
- **Next.js `middleware` → `proxy`**: Deprecation-Hinweis bei PLEXON-Builds (separates Refactoring)

## 8. Git-Referenz (letzte relevante Commits)

- CHECKION `main`: Commit mit Message `feat(platform): support owner-backed shared checkion access`
- PLEXON `main`: Commit mit Message `feat(platform): add project-aware provisioning controls`

Bei Abweichung zwischen dieser Datei und dem Code gilt immer der **Code** und die genannten Knowledge-Dateien.
