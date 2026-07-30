# Single-Platform / Coolify: Auth „ging vorher, jetzt nicht“ (ohne bewusste Env-Änderung)

Wenn ihr von getrennten Deployments auf **eine gemeinsame Plattform** (ein Coolify-Projekt, gemeinsames Netz, neues Compose-Template, anderer Reverse-Proxy) umgestellt habt und **weder PLEXON-Login noch AUDION/CHECKION-PLEXON-Login** mehr gehen – obwohl in der UI **dieselben Variablennamen** stehen wie zuvor – liegt das oft **nicht** an „falschem Passwort“, sondern an **anderem Ziel** für dieselbe Connection-URL oder an **Auth/Cookie-Pfaden**.

## 1. Gleiche `DATABASE_URL`, aber **andere Datenbank** (häufig)

- In einem **neuen** Stack zeigt `DATABASE_URL` oft auf einen **neuen** Postgres-Service oder ein **neues Volume** → leere `users`-Tabelle → jeder Login „falsch“.
- Die **Zeichenkette** in Coolify kann sich **gar nicht** geändert haben, wenn ihr nur das **Template dupliziert** habt: gleicher Platzhalter-Name, anderer interner Host (`postgres` vs `plexon-db-xxx`) oder neues Volume.

**Check (einmal im Postgres von PLEXON):**

```sql
SELECT count(*) AS user_count FROM users;
```

Ist `user_count = 0`, sind die Accounts physisch weg (oder ihr seid auf der falschen DB). Lösung: **Backup einspielen** oder Nutzer **neu registrieren**. Einmalige CHECKION→PLEXON-User-Migration nur manuell: `npm run migrate:checkion-users` (siehe `knowledge/plexon-setup.md`) — **nicht** mehr beim Container-Start.

## 2. `NEXTAUTH_URL` und **`BASE_PATH`** (PLEXON Next.js)

PLEXON unterstützt `BASE_PATH` (siehe `next.config.mjs`: `process.env.BASE_PATH`).

- **`NEXTAUTH_URL`** muss die **kanonische öffentliche URL inkl. Pfad** sein, unter der der Browser PLEXON wirklich aufruft, z. B. `https://host/plexon` – **nicht** `https://host`, wenn die App nur unter `/plexon` ausgeliefert wird.
- Weicht das ab, leidet NextAuth (CSRF/Cookies/Callbacks) → Login wirkt tot, obwohl die DB stimmt.

**Check:** Browser-Adressleiste = exakt der Wert für `NEXTAUTH_URL` (Schema, Host, optionaler Base-Path, **kein** trailing Slash laut NextAuth-Konvention prüfen).

## 3. Reverse-Proxy / „ein Eingang für alle“

Bei **einem** Ingress für mehrere Apps:

- Falsche **Route** (`/api/auth/*` landet beim falschen Container).
- **Body** wird bei POST abgeschnitten (selten, aber möglich mit falscher Buffering-Config).

**Check:** Im PLEXON-Container-Log bei Login nach `[PLEXON] auth.credentials` mit `reason` (z. B. `user_not_found`, `invalid_password`) oder `outcome: "error"`; parallel `POST` gegen `https://…/api/auth/validate-credentials` mit korrektem `X-Service-Secret` (nur intern testen).

## 4. Deploy-Image vs. Daten

Neues Image (z. B. nach Git-Push) ändert **keine** DB – aber **neuer** Postgres-Service + Volume schon. Immer zuerst **(1)** prüfen.

## 5. NextAuth: `[auth][error] CredentialsSignin`

Auth.js wirft **CredentialsSignin**, sobald der Credentials-`authorize`-Callback **`null`** zurückgibt (falsche/ fehlende Zugangsdaten, keine DB, Exception). Das ist **kein** Stack-Bug, sondern das erwartete Signal „Login abgelehnt“.

Nach Deploy mit erweiterten PLEXON-Logs siehst du in den Container-Logs **vor** diesem Eintrag Zeilen wie:

- `[PLEXON] auth.credentials` mit `reason: "user_not_found"` und `email_domain` → Zeile in `users` fehlt (falsche DB, falsche E-Mail-Normalisierung, leere DB).
- `reason: "invalid_password"` → User existiert, Passwort passt nicht zum Hash.
- `reason: "no_database_url"` → `DATABASE_URL` fehlt im Container.
- `reason: "missing_credentials"` → leeres Formular / fehlendes Feld.
- `outcome: "error"` / `reason: "exception"` → DB-Verbindung, Schema, o. Ä. (Details in der `console.error`-Zeile).

Siehe [Auth.js CredentialsSignin](https://errors.authjs.dev#credentialssignin).

## 6. Kurz-Checkliste

| Schritt | Was |
|--------|-----|
| 1 | `SELECT count(*) FROM users` in der DB, die **dieser** `DATABASE_URL` des PLEXON-Containers nutzt |
| 2 | `NEXTAUTH_URL` = exakt die URL, die Nutzer im Browser für PLEXON sehen; mit `BASE_PATH` den Pfad einschließen |
| 3 | AUDION: `GET …/api/health` → `auth.plexonAuthActive` und interne Backend-URL (siehe AUDION `knowledge/audion-plexon-auth.md`) |
| 4 | Coolify: **Volume** des Postgres an die richtige App gebunden, **kein** frisches leeres Volume nach Umzug |

## Siehe auch

- `knowledge/coolify-env-variablen.md` – Pflichtvariablen PLEXON
- `knowledge/plexon-setup.md` – Auth-Flow und Registrierung
- AUDION: `knowledge/audion-plexon-auth.md`
