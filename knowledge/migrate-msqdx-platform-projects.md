# Migration: CHECKION/AUDION → PLEXON Company „msqdx“

Ziel: Für die Organisation **msqdx** in PLEXON `platform_projects` + `platform_project_product_bindings` befüllen, damit Admin-Dropdowns (Entitlements) **Projektnamen** statt leerer Liste zeigen.

## Coolify (wie die CHECKION-User-Migration)

1. In der **PLEXON**-Application unter **Environment Variables** setzen:
   - `MIGRATION_MSQDX_PLATFORM_PROJECTS=1` — schaltet den Lauf beim **Container-Start** ein (`scripts/docker-entrypoint.sh` ruft das Skript nur auf, wenn **beide** Produkt-DB-URLs gesetzt sind; sonst eine Zeile „skipping“ ohne `node`).
   - `CHECKION_DATABASE_URL` und `AUDION_DATABASE_URL` (oder die `MIGRATION_*`-Alias-URLs) — **interne** Postgres-URLs, die vom PLEXON-Container aus erreichbar sind (gleiches Coolify-Netzwerk).
   - `DATABASE_URL` ist ohnehin gesetzt.
2. Optional: `DRY_RUN=1` einmal setzen, deployen, Logs prüfen, dann `DRY_RUN` entfernen und erneut deployen — oder direkt schreiben lassen, wenn die DB-URLs stimmen.
3. **Ohne** `CHECKION_DATABASE_URL` **und** `AUDION_DATABASE_URL` (oder `MIGRATION_*`-Alias): Das Skript loggt eine Warnung und beendet mit **Exit 0** (kein Stacktrace) — die App startet normal. Setze die internen URLs, sobald die Services im gleichen Netz erreichbar sind.
4. Nach erfolgreicher Migration: **`MIGRATION_MSQDX_PLATFORM_PROJECTS` auf `0` setzen oder entfernen**, damit jeder Deploy nicht erneut alle Projekte einliest (Skript ist idempotent, aber unnötige Last/Logs).

**Projekt-Dropdowns im Admin:** Zusätzlich kann die PLEXON-App (laufender Container) `CHECKION_DATABASE_URL` und `AUDION_DATABASE_URL` dauerhaft setzen — dann liest die API `/api/admin/users/.../product-project-options` alle CHECKION-`projects` bzw. AUDION-`projects` direkt aus den Produkt-DBs ein und zeigt sie in der Auswahl (gleiche IDs wie in CHECKION unter „Projekte“). Ohne diese URLs siehst du nur synchronisierte Plattform-Bindings und Legacy-Zuweisungen.

Lokal / CI ohne Docker-Entrypoint:

```bash
npm run migrate:msqdx-projects
```

## Skript (lokal)

```bash
cd PLEXON
DRY_RUN=1 \
DATABASE_URL="postgres://…plexon…" \
CHECKION_DATABASE_URL="postgres://…checkion…" \
AUDION_DATABASE_URL="postgres://…audion…" \
npm run migrate:msqdx-projects
```

Ohne `DRY_RUN=1` werden Daten geschrieben.

## Variablen

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `MIGRATION_MSQDX_PLATFORM_PROJECTS` | für Coolify-Auto-Lauf | `1` / `true` = beim Start ausführen; `0` / `false` / leer = überspringen |
| `DATABASE_URL` | ja | PLEXON Postgres |
| `CHECKION_DATABASE_URL` | ja | CHECKION DB (`projects`) |
| `AUDION_DATABASE_URL` | ja | AUDION DB (`audion.projects` o. Ä.) |
| `MIGRATION_COMPANY_SLUG` | nein | Default `msqdx` — match auf `companies.slug` oder exakten `name` (lower+trim) |
| `MIGRATION_CHECKION_DATABASE_URL` | nein | Alias für `CHECKION_DATABASE_URL` |
| `MIGRATION_AUDION_DATABASE_URL` | nein | Alias für `AUDION_DATABASE_URL` |
| `MIGRATION_AUDION_SCHEMA` | nein | Default `audion` |
| `DRY_RUN` | nein | `1` / `true` = nur Logs |

## Ablauf

1. Company per Slug/Name auflösen (muss genau eine Zeile sein).
2. **CHECKION:** Jedes `projects`-Row ohne gültiges PLEXON-Link → neues `platform_projects` unter dieser Company, Binding `checkion` = CHECKION-Projekt-ID, `projects.platform_project_id` / `platform_company_id` setzen.
3. **AUDION:** Wenn `checkion_project_id` gesetzt und bekannt → gleiches PLEXON-Projekt, Binding `audion` = AUDION-Projekt-UUID; sonst eigenes Plattform-Projekt nur mit AUDION-Binding.

`created_by_user_id` wird aus CHECKION/AUDION-Owner gesetzt, falls der Nutzer in PLEXON existiert; sonst erstes `company_users`-Mitglied der Company, sonst erster Admin.

## Voraussetzungen

- Company **msqdx** (oder gewählter Slug) muss in PLEXON existieren.
- Optional: mindestens ein `company_users`-Eintrag für sinnvolle Owner-Zuweisung.
