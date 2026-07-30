# PLEXON v3

**v3 parallel track** — GitHub `chbrdk/plexon-v3`. Prod Coolify stays on `chbrdk/PLEXON` (freeze).  
Snapshot origin: `knowledge/repo-origin.md` · Staging URL: `https://plexon-v3.projects-a.plygrnd.tech`

Next.js control plane with MSQDX Design System – login, app layout with navigation and logo.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3334. Set `AUTH_SECRET` (min 32 chars) and optionally `PLEXON_DEMO_EMAIL` / `PLEXON_DEMO_PASSWORD` in `.env` for login.

## Docker (Coolify)

```bash
docker build -t plexon .
docker run -p 3000:3000 -e AUTH_SECRET=your-secret -e DATABASE_URL=postgresql://... plexon
```

**Umgebungsvariablen (Coolify):** `AUTH_SECRET` (Pflicht), `DATABASE_URL` (PostgreSQL für User & Registrierung), `NEXTAUTH_URL`. Mit `DATABASE_URL` wird beim Container-Start `drizzle-kit push` ausgeführt (Tabellen angelegt). Optional: `PLEXON_DEMO_EMAIL` / `PLEXON_DEMO_PASSWORD` für Demo-Login ohne DB.

**Coolify:** App läuft auf Port **3000** (Next.js Standard, wie CHECKION). Kein Port-Mapping nötig – Coolify-Default (3000:3000) reicht.

**Coolify – Checkliste (wenn du 404/503 bekommst):**

1. **Port:** Standard 3000. Port Mappings leer lassen oder 3000:3000.
2. **Umgebungsvariablen:** `AUTH_SECRET`, `NEXTAUTH_URL` (z. B. `https://plexon.projects-a.plygrnd.tech`). Optional: `PLEXON_DEMO_EMAIL`, `PLEXON_DEMO_PASSWORD`, `BASE_PATH` (siehe unten).
3. **Wo kommt die 404 her?** Bitte nacheinander testen:
   - **`https://plexon.projects-a.plygrnd.tech/api/health`**  
     → **200 + `{"status":"ok"}`**: App ist erreichbar, 404 kommt von einer bestimmten Route.  
     → **404**: Traffic erreicht die App nicht (Port, Proxy-Ziel oder falsche Domain prüfen).
   - **`https://plexon.projects-a.plygrnd.tech/login`**  
     → Wenn hier die Login-Seite erscheint, aber **`/`** 404: Coolify nutzt vermutlich einen **Pfad-Prefix** (z. B. `/plexon`). In Coolify unter der App nach „Path“, „Application Path“ oder „URL Path“ suchen und diesen Wert als Umgebungsvariable **`BASE_PATH`** setzen (z. B. `BASE_PATH=/plexon`), dann neu deployen.
4. **Re-Deploy** nach jeder Änderung an Port oder Env.

Design system is cloned from GitHub during build; no local `msqdx-design-system` needed.
