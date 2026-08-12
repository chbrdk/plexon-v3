# Coolify – Umgebungsvariablen für PLEXON (inkl. CHECKION & AUDION MCP)

Alle Anleitungen für die Coolify-Variablen, die du für PLEXON und die Board-MCP-Integration (CHECKION + AUDION) brauchst.

---

## 1. PLEXON-App (Next.js)

In Coolify: **Application** PLEXON → **Environment Variables**.

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `AUTH_SECRET` | Ja | NextAuth Secret (min. 32 Zeichen). |
| `DATABASE_URL` | Ja (wenn DB) | PostgreSQL-URL für PLEXON (User, API-Tokens). |
| `MIGRATION_MSQDX_PLATFORM_PROJECTS` | Nein | `1`/`true`: beim Container-Start Plattform-Projekt-Migration (`migrate-product-projects-to-msqdx-company.mjs`); setzt `CHECKION_DATABASE_URL` + `AUDION_DATABASE_URL` voraus. Nach Erfolg wieder `0` oder entfernen. |
| `CHECKION_DATABASE_URL` | Migration + optional Admin-UI | Interne Postgres-URL der CHECKION-DB: msqdx-Migration **und** Befüllung der Projekt-Dropdowns (CHECKION-`projects`). |
| `AUDION_DATABASE_URL` | Migration + optional Admin-UI | Interne Postgres-URL der AUDION-DB: Migration **und** Dropdowns. |
| `NEXTAUTH_URL` | Ja | Exakte öffentliche URL von PLEXON, z. B. `https://plexon.deine-domain.com`. **Mit `BASE_PATH`** muss die URL den **Pfad enthalten** (z. B. `https://host/plexon`), sonst bricht NextAuth/Cookies – siehe `knowledge/single-platform-auth-troubleshooting.md`. |
| `PLEXON_SERVICE_SECRET` | Empfohlen | Shared Secret für Service-zu-Service (CHECKION/AUDION → PLEXON Auth). Min. 16 Zeichen. |
| `ANTHROPIC_API_KEY` | Ja (für Board) | API-Key für Claude (Board-Prompt-Completion). |
| `ANTHROPIC_BOARD_MODEL` | Nein | Override für Claude-Modell (Standard: Sonnet 4 ohne MCP, Sonnet 4.6 mit MCP). |

### Passwort-Reset (E-Mail)

Coolify-**Systembenachrichtigungen** nutzen den SMTP des **Coolify-Servers** – deine **PLEXON-App** bekommt davon keine automatischen Zugangsdaten. Für Reset-Mails: **SMTP** (eigener Relay, Mailgun-SMTP, Provider …) und/oder **Mailgun HTTP-API** (ohne SMTP), sonst nur **Log** im Container.

**Priorität in PLEXON:** 1) **SMTP**, wenn `PLEXON_SMTP_HOST` oder `SMTP_HOST` gesetzt ist → 2) sonst **Mailgun**, wenn `MAILGUN_API_KEY` **und** `MAILGUN_DOMAIN` gesetzt sind → 3) sonst nur **Log** (Link erscheint in den Container-Logs).

**Coolify:** Mailgun- und SMTP-Variablen müssen für den **laufenden Container** gelten (**Runtime** / „Environment“), nicht nur für den **Docker-Build**. Wenn du sie nur als Build-Args setzt oder die App nach dem Setzen nicht neu deployt, sieht PLEXON sie nicht. Prüfen: `GET /api/health` → Feld **`passwordResetMail`** (`transport`, `mailgunApiKeySet`, `mailgunDomainSet`, `smtpHostSet`) — **ohne** Key auszugeben.

**Mailgun `401 Forbidden`:** meist falscher **Private API Key** (nicht „Public validation key“, nicht Webhook-Signing) oder **falsche Region** (EU-Konto braucht `MAILGUN_REGION=eu` / `MAILGUN_EU=1` oder `MAILGUN_API_BASE_URL=https://api.eu.mailgun.net`). Seltener: **IP-Allowlist** in Mailgun blockiert den Coolify-Server. Prüfen: `GET /api/health` → `passwordResetMail.mailgunApiBase` (muss zur Region passen) und `mailgunKeyFormatHint` (`private-key-prefix-ok` = Key beginnt mit `key-`).

**Mailgun `403` „activate your Mailgun account“:** Das **Mailgun-Konto** ist noch nicht freigeschaltet (Aktivierungs-Mail im Postfach oder im [Mailgun-Dashboard](https://app.mailgun.com/) erneut senden). Das betrifft **alle** Domains bis zur Aktivierung — kein PLEXON-Bug und kein `MAILGUN_DOMAIN`-Tippfehler.

#### Minimal: SMTP vom E-Mail-Anbieter

Gilt, wenn ihr bei einem **E-Mail-Hoster** (Microsoft 365, Google Workspace, All-Inkl, IONOS **E-Mail-Paket**, …) ein **Postfach oder SMTP-Zugang** habt — **nicht**, wenn beim Registrar nur die Domain ohne Mail-Produkt liegt.

Du brauchst dann **keinen** extra Mail-Container in Coolify — nur die SMTP-Daten aus der **E-Mail-Anbieter**-Doku. In Coolify bei **PLEXON** setzen:

1. `SMTP_HOST` = Hostname aus der Anbieter-Doku (z. B. `smtp.office365.com`) — **ohne** `https://`.
2. `SMTP_PORT` = meist **587** (STARTTLS). Nur wenn der Anbieter **465** verlangt: Port **465** und `SMTP_SECURE=true`.
3. `SMTP_USER` / `SMTP_PASSWORD` = Zugangsdaten (oft App-Passwort / SMTP-User laut Anbieter).
4. `PLEXON_PASSWORD_RESET_FROM_EMAIL` = z. B. `PLEXON <noreply@deine-domain.de>` — muss beim **Mail-Anbieter** erlaubt sein.
5. **`MAILGUN_API_KEY` / `MAILGUN_DOMAIN` weglassen**, wenn du **nur** SMTP willst (SMTP hat Vorrang).

`NEXTAUTH_URL` (bzw. `PUBLIC_APP_URL`) weiterhin setzen, damit der Link in der Mail stimmt.

#### Nur Domain beim Registrar (z. B. Checkdomain) — kein Mail dort

Liegt bei **Checkdomain** (oder vergleichbar) **nur die Domain** (DNS zeigt auf euren Server) und **kein** E-Mail-/Postfach-Produkt beim Registrar, dann gibt es **keine** SMTP-Daten „von Checkdomain“ für PLEXON. **Coolify** startet eure Apps auf dem Server; **neue Dienste** (inkl. optionaler kleiner Mail-Relay-Container) legt ihr dort ebenfalls als **eigene Application** an — nicht beim Registrar.

**Passwort-Reset geht dann z. B. so:**

| Variante | Kurz |
|----------|------|
| **Mailgun (HTTP-API)** | `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` in PLEXON; Domain und Absender in [Mailgun](https://app.mailgun.com) wie in deren Doku einrichten. Optional `MAILGUN_REGION=eu` bzw. `MAILGUN_EU=1` für die EU-API. **Kein** eigener Mail-Container nötig. |
| **Separater Mail-Dienst mit SMTP** | Z. B. später Workspace/anderer Hoster: dann `SMTP_*` wie oben. |
| **Relay nur in Coolify** | Zusätzliche App im gleichen Projekt (siehe Abschnitt unten), `SMTP_HOST` = **interner Service-Name** dieser App. |

MX/SPF/DKIM für eure Domain setzt ihr dort, wo die **DNS-Zone** liegt (Registrar oder externer DNS), unabhängig von PLEXON.

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `PLEXON_SMTP_HOST` oder `SMTP_HOST` | Nein (für SMTP) | SMTP-Server, z. B. intern `smtp-relay.coolify` oder Host deines Providers. |
| `PLEXON_SMTP_PORT` oder `SMTP_PORT` | Nein | Standard **587**. **465** impliziert oft TLS (`secure`). |
| `PLEXON_SMTP_USER` / `PLEXON_SMTP_PASSWORD` oder `SMTP_USER` / `SMTP_PASSWORD` (`SMTP_PASS`) | Je nach Server | Leer lassen nur, wenn der Relay **ohne** Auth erlaubt (selten außerhalb geschlossener Netze). |
| `PLEXON_SMTP_SECURE` oder `SMTP_SECURE` | Nein | `true` / `1` für TLS wie bei Port 465. |
| `PLEXON_PASSWORD_RESET_FROM_EMAIL` oder `PLEXON_SMTP_FROM` / `SMTP_FROM` | Empfohlen | Absender, z. B. `PLEXON <noreply@deine-domain.com>`. Bei Mailgun-API muss die Adresse zur verifizierten Domain passen; ohne Wert nutzt PLEXON `postmaster@<MAILGUN_DOMAIN>`. Bei SMTP: ohne Wert ggf. `SMTP_USER` als Absender. |
| `MAILGUN_API_KEY` | Nein (für Mailgun-API) | **Private API key** aus dem Mailgun-Dashboard. Aliase: `MG_API_KEY`, `MAILGUN_PRIVATE_API_KEY`. Nur wirksam, wenn **kein** SMTP-Host gesetzt ist und `MAILGUN_DOMAIN` gesetzt ist. |
| `MAILGUN_DOMAIN` | Nein (für Mailgun-API) | Sende-Domain aus Mailgun (z. B. `mg.deine-domain.de`). Aliase: `MAILGUN_SENDING_DOMAIN`, `MG_DOMAIN`. |
| `MAILGUN_REGION` oder `MAILGUN_EU` | Nein | `MAILGUN_REGION=eu` oder `MAILGUN_EU=1` / `true`: EU-Endpoint (`api.eu.mailgun.net`). Standard: US (`api.mailgun.net`). **401** oft bei EU-Konto mit US-Default — EU setzen oder `MAILGUN_API_BASE_URL`. |
| `MAILGUN_API_BASE_URL` | Nein | Volle API-Basis-URL, z. B. `https://api.eu.mailgun.net` — überschreibt US/EU-Logik, wenn Mailgun eine andere Basis vorgibt. |
| `MAILGUN_BASIC_USERNAME` | Nein | HTTP-Basic-**User** (Passwort bleibt der private API-Key). Standard: `api`. Nur ändern, wenn Mailgun/Sinch etwas anderes verlangt. |
| `NEXTAUTH_URL` / `PUBLIC_APP_URL` | Für gültige Links | Basis-URL für den Reset-Link in der E-Mail. |

#### Eigener „kleiner“ Mailserver / Relay in Coolify

**Ja.** In Coolify legst du eine **weitere Application** (oder einen **Docker Compose**-Stack) an — unabhängig von PLEXON. PLEXON spricht dann nur **SMTP** (wie bei jedem anderen Provider).

| Ansatz | Wofür | Hinweis |
|--------|--------|--------|
| **Nur Versand (Relay)** | Transaktionsmails (Passwort-Reset, Benachrichtigungen) | Am schlanksten: z. B. **Postfix** als Relay mit Auth, oder ein fertiges Image (**docker-mailserver**, **Mailu**, **Stalwart** …). PLEXON: `PLEXON_SMTP_HOST` = **Hostname** des Mail-Services im gleichen Coolify-Projekt (z. B. `mail` oder `smtp-relay` — **ohne** `https://`), Port **587** + TLS. |
| **Vollständiger Mailserver** | Postfächer, IMAP, Webmail | Deutlich mehr Betrieb (Updates, Spam, Backups, Zertifikate). Für „nur App-Mails“ meist oversized. |
| **Mailpit / MailHog** | Entwicklung / Demo | Fängt Mails ab, liefert **nicht** zu echten Empfängern — nicht für Produktion. |

**Mailpit — wann sinnvoll?** **Ja** für **Entwicklung, Staging oder interne Demos**: PLEXON sendet per SMTP an Mailpit (eigene kleine App in Coolify möglich), du siehst Mails und **Reset-Links** in der Mailpit-Web-UI — ohne echtes Zustellen ins Internet. **Nein** für **Produktion**, wenn echte Nutzer eine E-Mail mit Link erwarten: Mailpit ist ein **Fangkorb**, kein Postausgang zu Gmail & Co.

**Wichtig bei „selbst hosten“:**

1. **Port 25** wird bei vielen Hosting-Anbietern **gesperrt** oder nur auf Antrag freigegeben (Spam-Schutz). Ohne funktionierenden **Outbound** auf 25/587 zu anderen MX-Servern kommen keine Mails bei Gmail & Co. an.
2. **Zustellbarkeit:** Für eure Absender-Domain braucht ihr **SPF**, idealerweise **DKIM** und **DMARC** — egal ob eigener Server, Mailgun oder anderer Versand.
3. **Coolify-Netz:** PLEXON und der Mail-Container im **gleichen Projekt** → SMTP-URL z. B. `PLEXON_SMTP_HOST=smtp-relay` (Hostname = Coolify-Name des Mail-Services), Port **587**, User/Pass wie im Mail-Image konfiguriert. Traefik terminiert dafür meist **kein** HTTPS; SMTP läuft **direkt** auf den exponierten Ports oder nur **intern** zwischen Containern (sicherer).

**Pragmatischer Mittelweg:** Wenn ihr **nur** die Domain beim Registrar habt: **Mailgun** mit verifizierter Send-Domain (`MAILGUN_API_KEY` + `MAILGUN_DOMAIN`) — oder später ein **Relay als eigene Coolify-App** (interner `SMTP_HOST`) mit Smarthost nach außen. „SMTP vom E-Mail-Anbieter“ gilt nur, wenn dort **wirklich** ein Mail-Produkt läuft.

### CHECKION MCP am Board

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `CHECKION_MCP_URL` | Nein | Basis-URL des CHECKION-MCP-Servers (Streamable HTTP). Wenn gesetzt, erscheint die CHECKION-Option im Port-Menü und Tools werden geladen. Z. B. `https://checkion.example.com/mcp` oder **intern** `http://<checkion-mcp-service-name>:3100`. |
| `MCP_SERVER_URL` | Nein | Fallback, wenn `CHECKION_MCP_URL` nicht gesetzt ist (gleiche Bedeutung). |
| `CHECKION_API_URL` | Empfohlen (Assistant) | FastAPI/REST-Basis für Projektkontext, Research, Knowledge-Retrieval. **Nicht** die öffentliche Web-URL. |
| `CHECKION_API_TOKEN` | Empfohlen (Assistant) | Service-Token für CHECKION REST (`CHECKION_SERVICE_TOKEN` Alias). **Auf dem PLEXON-Container setzen** — nicht nur auf dem CHECKION-MCP-Service. Format: `checkion_` + 64 Hex (CHECKION → Einstellungen → API-Zugang). **Nicht** `CHECKION_ADMIN_API_KEY` (separater Admin-Key). |

### AUDION REST + MCP (Assistant, Projektkontext, Board)

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `AUDION_API_URL` | **Ja (Assistant)** | FastAPI-Basis mit `/api` auf dem öffentlichen Host, z. B. `https://audion.projects-a.plygrnd.tech/api` oder intern `http://audion-api:8000`. **Ohne Variable:** Fallback aus `NEXT_PUBLIC_AUDION_ADMIN_URL` → `{origin}/api` (nicht mehr die nackte Web-URL). |
| `AUDION_API_TOKEN` | **Ja (Assistant)** | API-Token aus AUDION Admin → API-Zugang (`audion_` + Hex). Alias: `AUDION_SERVICE_TOKEN`. |
| `AUDION_MCP_URL` | Nein | MCP für Assistant/Board. Intern: `http://audion-mcp:3100`. |
| `NEXT_PUBLIC_AUDION_ADMIN_URL` | Nein | Nur Deep-Links ins AUDION-Admin-UI – **nicht** als API-URL verwenden. |

**Diagnose (Admin):** `GET /api/services/audion/status` – prüft Env + `GET /projects` gegen FastAPI. Der Assistant bekommt dieselbe Info im System-Prompt (Projektliste, MCP-Status).

**Sync-Diagnose im Chat:** Prompt wie „Sync-Diagnose“ oder „audion ✗“ nutzt `probeAudionApiHealth` + CHECKION-Probe – bei Fehlern `AUDION_API_URL` mit `/api` und `CHECKION_API_TOKEN` prüfen.

### ECHON MCP (Markt-Intelligence, Assistant)

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `ECHON_MCP_URL` | Nein | MCP für Assistant. Intern: `http://echon-mcp:3101`. |
| `ECHON_API_URL` | Empfohlen | FastAPI-Basis für Health-Probe im Assistant. Intern: `http://echon-v2-api:8000`. |
| `ECHON_SERVICE_TOKEN` | Nein | Bearer für ECHON API (falls Auth aktiv). |

PLEXON aktiviert ECHON-MCP automatisch, wenn `ECHON_MCP_URL` gesetzt ist **und** der Nutzer CHECKION- oder AUDION-Entitlement hat.

### BRANDION MCP (Guidelines / Design Tokens, Assistant)

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `BRANDION_MCP_URL` | Nein | MCP für Assistant. Intern: `http://brandion-mcp:3100`. Spec: `specs/domain/assistant-brandion-mcp.md`. |

PLEXON aktiviert BRANDION-MCP, wenn `BRANDION_MCP_URL` gesetzt ist **und** Gate `resolveUseProductMcp` greift (Entitlement, Host-Produkt/pageContext, oder Sibling-Entitlement). Staging: öffentliche FQDN `https://g79ues4e48rh8wq6g3jrabpv.projects-a.plygrnd.tech` — **nicht** `http://brandion-mcp:3100` (anderes Coolify-Projekt). Tools: `brandion.guidelines_list`, `brandion.guideline_get`, `brandion.tokens_list`.

### CREATION MCP

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `CREATION_MCP_URL` | Nein | MCP für Assistant (library/compositions/projects). Port **3102**. Spec: `specs/domain/assistant-creation-mcp.md`. |

PLEXON aktiviert CREATION-MCP analog Brandion (`resolveUseCreationMcp`). Tools: `creation.library_catalog`, `creation.compositions_list`, `creation.projects_list`, `creation.project_get`.

### AUDION MCP

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `AUDION_MCP_URL` | Nein | Staging: `https://mcp-audion.projects-a.plygrnd.tech` (Coolify `audion-mcp`). Ohne diese Variable sind AUDION-Tools im Assistant tot — Entitlement allein reicht nicht. |

### PLEXON Assistant (Phase 2 Workflows)

Zusätzliche Variablen für deterministische Workflows und External APIs. Pfade zentral in `lib/paths/checkion-api.ts`, `lib/paths/external-apis.ts` — **nicht** in Coolify hardcoden, nur Basis-URLs override.

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `ASSISTANT_DOMAIN_SCAN_MAX_PAGES` | Nein | Max. gecrawlte Seiten pro Domain Deep Scan (Default **50**, Obergrenze 500). |
| `MOZILLA_OBSERVATORY_API_BASE` | Nein | Mozilla HTTP Observatory API (Default `https://http-observatory.security.mozilla.org/api/v2`). Für Website-Audit Security-Headers-Step. |
| `CLOUDFLARE_DNS_QUERY_URL` | Nein | Cloudflare DNS-over-HTTPS (Default `https://cloudflare-dns.com/dns-query`). Für optionalen DNS-Check im Website-Audit. |
| `W3C_VALIDATOR_URL` | Nein | W3C Nu-Validator Basis (Default `https://validator.w3.org/nu/`) — reserviert für spätere External-Steps. |
| `ANTHROPIC_ASSISTANT_MODEL` | Nein | Claude-Modell für Assistant Free-Chat (Default Sonnet 4.6). |
| `ANTHROPIC_PLANNER_MODEL` | Nein | Haiku für Tool-Planung (Default Haiku 4.5). |
| `ANTHROPIC_ASSISTANT_THINKING_BUDGET` | Nein | Extended Thinking Token-Budget (Default `4096`; `0`/`off`/`false` = aus). |
| `CAPABILITY_CATALOG_RUNTIME` | Nein | Capability Catalog Agent↔Flow shared executors (Wave C1). Default **off**. Explicit on: `1` / `true` / `on` / `yes`. Spec: `specs/domain/capability-catalog.md`. |

**Staging-Check (manuell):** Nach Deploy `Website audit https://<echte-url>` im Assistant — erfordert `CHECKION_API_URL` + `CHECKION_API_TOKEN`. Orchestrator-Doku: `knowledge/plexon-assistant-orchestrator.md`.

### CHECKION MCP Hinweis

Wenn der CHECKION-MCP hinter einem öffentlichen Proxy 500 oder leeren Body liefert, **interne URL** verwenden: gleiches Coolify-Projekt, dann z. B. `http://checkion-mcp:3100` (Service-Name = Coolify-App-Name des MCP-Services). Siehe `knowledge/checkion-mcp-board-tools.md` (Troubleshooting).

**AUDION MCP:** wie CHECKION intern anbinden (`http://audion-mcp:3100`), um Proxy-404 bei POST zu vermeiden.

---

## 2. CHECKION-MCP-Service (Coolify)

Eigene **Application** in Coolify für den CHECKION-MCP-Server (Node/TypeScript). Build: Dockerfile aus CHECKION-1-Repo (z. B. `Dockerfile.mcp-server`), Build Context = Repo-Root.

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `CHECKION_API_URL` | Ja | Basis-URL der CHECKION-API, z. B. `https://checkion.example.com/api` oder intern `http://checkion-api:3000`. |
| `CHECKION_API_TOKEN` | Ja | API-Token eines CHECKION-Benutzers (aus CHECKION erzeugen). |
| `MCP_STATELESS` | Empfohlen | `true` – damit keine Session-Header durch den Proxy müssen; vermeidet „Mcp-Session-Id required“. |

Port des Containers: **3100** (Streamable HTTP).

---

## 3. AUDION-MCP-Service (Coolify)

Eigene **Application** in Coolify für den AUDION-MCP-Server (Node/TypeScript). Build: `Dockerfile.mcp-server` im AUDION-v2-Repo-Root, Build Context = Repo-Root (Base Directory leer oder `.`).

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `AUDION_API_URL` | Ja | Basis-URL der AUDION-FastAPI-API **ohne** Pfad-Suffix, z. B. `http://audion-api:8000` (intern) oder `https://api.audion.example.com`. Die FastAPI-Routen sind `/health`, `/projects`, `/auth/...` usw. – **kein** `/api` davor, außer euer Deployment setzt einen solchen Prefix. |
| `AUDION_API_TOKEN` | Ja | API-Token eines AUDION-Benutzers (in AUDION unter Admin → Profil → API-Zugang erzeugen, Format `audion_...`). |
| `MCP_STATELESS` | Empfohlen | `true` – Session-frei, proxy-tauglich. |

Port des Containers: **3100** (Streamable HTTP).

**Dockerfile-Pfad in Coolify:** `Dockerfile.mcp-server` (im Repo-Root). **Base Directory:** leer oder `.`, damit der Build-Kontext das komplette Repo sieht.

### 404 bei AUDION-Tools („API antwortet mit 404“)

Zwei mögliche Ursachen:

1. **404 beim Aufruf des MCP (POST tools/call)**  
   PLEXON ruft `POST AUDION_MCP_URL` auf. Wenn der Reverse-Proxy (Coolify/Traefik) nur GET weiterleitet oder für POST 404 liefert:
   - Proxy so konfigurieren, dass **POST** an die MCP-URL an den AUDION-MCP-Container (Port 3100) weitergeleitet wird.
   - Oder **interne URL** in PLEXON verwenden: `AUDION_MCP_URL=http://<audion-mcp-service-name>:3100` (gleiches Coolify-Projekt), dann geht der Traffic nicht über den öffentlichen Proxy.

2. **404 von der AUDION-API, wenn ein Tool läuft**  
   Dann kommt der Fehler aus der FastAPI, nicht aus dem MCP. Im AUDION-MCP-Container:
   - `AUDION_API_URL` muss exakt die Basis-URL der FastAPI sein (z. B. `http://audion-api:8000` intern), **ohne** trailing slash, **ohne** `/api`, falls die API keine Prefix-Route hat.
   - Erreichbarkeit aus dem MCP-Container prüfen (gleiches Netzwerk, korrekter Service-Name).

---

## 4. Kurz-Checkliste

- **PLEXON:** `AUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`; `AUDION_API_URL` + `AUDION_API_TOKEN` (Assistant/Projektkontext); `CHECKION_API_URL` + `CHECKION_API_TOKEN` (Assistant-Workflows); optional `CHECKION_MCP_URL` und/oder `AUDION_MCP_URL` (am besten interne URLs); optional `ASSISTANT_DOMAIN_SCAN_MAX_PAGES`, External-API-Overrides siehe oben.
- **CHECKION MCP:** `CHECKION_API_URL`, `CHECKION_API_TOKEN`, `MCP_STATELESS=true`.
- **AUDION MCP:** `AUDION_API_URL`, `AUDION_API_TOKEN`, `MCP_STATELESS=true`.

Wenn beide MCP-URLs in PLEXON gesetzt sind, können Nutzer am Board wahlweise CHECKION, AUDION oder beide Tool-Karten in die Kette legen; die API lädt dann die jeweiligen Tools und ruft die passenden MCP-Server auf.
