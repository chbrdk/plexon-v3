# PLEXON – Frontend-Grundgerüst

PLEXON ist eine weitere Plattform neben CHECKION mit demselben Grundgerüst: Login, App-Layout mit Navigation und Logo, basierend auf dem **MSQDX Design System**.

## Struktur

- **App**: Next.js 16, App Router
- **Design**: `@msqdx/react`, `@msqdx/tokens` (wie CHECKION, gleicher DS-Pfad)
- **Auth**: NextAuth v5 (Credentials), optional Demo-User per Env
- **i18n**: de/en über `lib/i18n` und `locales/de.json`, `locales/en.json`
- **Pfade/URLs**: zentral in `lib/constants.ts`

## Wichtige Pfade

| Konstante       | Wert      |
|----------------|-----------|
| `PATH_HOME`    | `/`       |
| `PATH_LOGIN`   | `/login`  |
| `PATH_REGISTER`| `/register` |
| `PATH_SETTINGS`| `/settings` |

## Login & Auth

- Login: `app/login/page.tsx`. Registrierung: `app/register/page.tsx` (Formular wie CHECKION).
- Auth: `auth.ts` (NextAuth Credentials). Bei gesetzter `DATABASE_URL`: Login/Register gegen PostgreSQL. Ohne DB: optional `PLEXON_DEMO_EMAIL` / `PLEXON_DEMO_PASSWORD`.
- **Datenbank:** PostgreSQL, Drizzle ORM. Schema nur `users` (id, email, password_hash, name, created_at). Beim Docker-Start wird `drizzle-kit push` ausgeführt. Lokal: `DATABASE_URL` setzen, dann `npm run db:push`.
- **API:** `POST /api/auth/register` (Body: email, password, name optional). Passwort: min. 8 Zeichen, je 1 Groß-/Kleinbuchstabe, 1 Ziffer.

## MSQDX Design System

- Pakete: `file:../msqdx-design-system/packages/react` und `.../tokens`.
- `next.config.mjs`: Webpack-Alias löst `@msqdx/react` und `@msqdx/tokens` auf. Standard: `../msqdx-design-system/packages`. Wenn das Design-System woanders liegt (z. B. unter `MSQDX-DS`), Umgebungsvariable `DS_BASE` setzen (z. B. `DS_BASE=../MSQDX-DS/msqdx-design-system`).
- Komponenten: `MsqdxAppLayout`, `MsqdxAdminNav`, `MsqdxLogo`, `MsqdxMoleculeCard`, `MsqdxFormField`, `MsqdxButton`, `MsqdxTypography` etc.

## Skripte

- `npm run dev` – Dev-Server auf Port **3334**
- `npm run build` – Production Build
- `npm run test` – Vitest

## Zentrale User-Verwaltung (ein Konto, alle Dienste)

- **PLEXON-DB ausschließlich für User:** Nur in der PLEXON-Datenbank liegen Nutzerdaten (`users`, `api_tokens`). So bleibt die PLEXON-DB klein; CHECKION/AUDION/VIDEON können **eigene** Datenbanken nur für ihre App-Daten (Scans, Projekte, …) betreiben – keine riesigen gemeinsamen DBs.
- **Login in CHECKION/AUDION:** Beim Anmelden rufen die Dienste die PLEXON-API auf (`POST /api/auth/validate-credentials`). PLEXON prüft E-Mail/Passwort gegen die eigene DB und liefert `{ user: { id, email, name } }`. Der Service speichert nur die `user_id` in seinen Tabellen (Scans, Projekte, …); keine eigene User-Tabelle nötig. **E-Mails** sollten in `users.email` **kleingeschrieben** gespeichert sein (Registrierung normalisiert); ältere gemischte Schreibweise per SQL `UPDATE users SET email = lower(trim(email))` bereinigen, falls nötig.
- **Konfiguration:** In PLEXON `PLEXON_SERVICE_SECRET` setzen (min. 16 Zeichen). In CHECKION/AUDION: `PLEXON_AUTH_URL` (z. B. `https://plexon.example.com`) und `PLEXON_SERVICE_SECRET` (derselbe Wert). Die API erwartet Header `X-Service-Secret: <secret>`.
- **Profil-Sync:** `GET /api/services/profile?user_id=<id>` und `PATCH /api/services/profile` (Body: `user_id`, optional `name`, `company`, `avatar_url`, `locale`, `email`) ermöglichen CHECKION und AUDION, Profildaten (Name, Unternehmen, Avatar, Sprache) aus PLEXON zu lesen und Änderungen nach PLEXON zu schreiben. So bleibt das Profil zentral in PLEXON.
- **Registrierung nur in PLEXON:** Nutzer legen ihr Konto in PLEXON an. In CHECKION/AUDION optional `NEXT_PUBLIC_PLEXON_REGISTER_URL` setzen, dann erscheint „In PLEXON registrieren“ auf der Register-Seite.
- **PLEXON-Dashboard:** „Zentrale Nutzer“ aus der PLEXON-DB (`GET/PATCH/DELETE /api/admin/users`).

### Alternative: Gemeinsame DB (eine Datenbank für alle)

- Statt Auth-API kann CHECKION dieselbe `DATABASE_URL` wie PLEXON nutzen; dann liegt die Tabelle `users` in derselben DB wie CHECKIONs Scans/Projekte. Einfacher, aber eine große gemeinsame DB. Für getrennte DBs (PLEXON klein, CHECKION nur App-Daten) die Auth-API nutzen.

## Migration: CHECKION-User nach PLEXON

Wenn CHECKION bereits eine eigene User-Tabelle hat, können alle User einmalig nach PLEXON kopiert werden. **Die User-IDs bleiben gleich**, damit CHECKIONs Projekte/Scans weiterhin der richtigen Person zugeordnet sind.

### Voraussetzungen

- PLEXON-DB existiert und Schema ist angelegt (`npm run db:push` in PLEXON).
- Zugriff auf beide Datenbanken (CHECKION = Quelle, PLEXON = Ziel).

### Ablauf (nur manuell)

Die User-Migration läuft **nicht mehr** beim Container-Start (`docker-entrypoint.sh`). Früher hat `MIGRATION_SOURCE_DATABASE_URL` bei jedem Deploy CHECKION-Passwörter nach PLEXON geschrieben und bestehende Konten überschrieben.

1. `DATABASE_URL` = PLEXON-PostgreSQL (Ziel), `MIGRATION_SOURCE_DATABASE_URL` = CHECKION-PostgreSQL (Quelle).
2. Einmalig: `npm run migrate:checkion-users` oder `node scripts/migrate-checkion-users-to-plexon.mjs`.
3. **`MIGRATION_SOURCE_DATABASE_URL` nicht** in Coolify als Dauer-Env setzen (wird ohnehin nicht mehr automatisch ausgeführt).

**Ergebnis:** User aus CHECKION werden in PLEXON eingefügt. Bei gleicher `id` werden Profilfelder aktualisiert, **`password_hash` in PLEXON wird nicht überschrieben** (bestehende PLEXON-Passwörter bleiben).

**E-Mail-Kollision:** Existiert in PLEXON bereits ein Nutzer mit derselben E-Mail aber **anderer** `id`, wird die CHECKION-Zeile **übersprungen** (Warnung im Log), damit `users_email_unique` nicht verletzt wird (typisch: Konto zuerst in PLEXON angelegt).

### Nach der Migration

- CHECKION auf zentrale Auth umstellen: `PLEXON_AUTH_URL` und `PLEXON_SERVICE_SECRET` in CHECKION setzen. Ab dann validiert CHECKION den Login über die PLEXON-API.
- Optional: CHECKION-DB von der User-Tabelle entkoppeln (eigene DB nur für Scans/Projekte; User-Tabelle kann leer bleiben oder später entfernt werden).

## Unterschied zu CHECKION

- Eigenes Projekt (eigener Ordner), keine CHECKION-spezifischen Features (Scan, History, Projects, Share).
- Sidebar nur: Dashboard, Einstellungen.
- Eigene Locale- und Brand-Color-Storage-Keys (`plexon_locale`, `plexon-sidebar-color`).
- Content-Attribut im Layout: `data-plexon-content` (analog zu `data-checkion-content`).

## Coolify

**Vollständige Anleitung** (was wo in Coolify hinterlegt werden muss für PLEXON + CHECKION): siehe im CHECKION-Repo **`knowledge/coolify-vollstaendige-anleitung.md`**. **Umgebungsvariablen für PLEXON inkl. CHECKION- und AUDION-MCP:** siehe **`knowledge/coolify-env-variablen.md`**. **Nach Umstellung auf eine gemeinsame Plattform (ein Stack, ein Proxy):** `knowledge/single-platform-auth-troubleshooting.md`. Kurz für PLEXON: Port **3000**; Env `AUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL` (exakte PLEXON-URL), `PLEXON_SERVICE_SECRET`; optional `CHECKION_MCP_URL`, `AUDION_MCP_URL` (für Board-Tools).
