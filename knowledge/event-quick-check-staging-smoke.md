# Event Quick Check — Staging Smoke (plexon-v3)

**Stand:** 2026-08-05  
**Ziel:** Nachweisen, dass Quick Check in plexon-v3 **nicht fehlt**, sondern end-to-end mit checkion-v3 / audion-v3 läuft.

## Voraussetzung (Coolify plexon-v3 Runtime)

Zusätzlich zu Wave-A-Basis (`AUTH_SECRET`, `DATABASE_URL`, `PLEXON_SERVICE_SECRET`, `NEXT_PUBLIC_AUDION_ADMIN_URL`):

```bash
# CHECKION v3 (Deep Scan + GEO)
NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech
CHECKION_API_URL=https://checkion-v3.projects-a.plygrnd.tech
CHECKION_API_TOKEN=checkion_<64-hex>   # aus checkion-v3 → Settings → API-Zugang

# AUDION v3 (Personas / GEO-Fragen)
NEXT_PUBLIC_AUDION_ADMIN_URL=https://audion-v3.projects-a.plygrnd.tech/
AUDION_API_URL=https://audion-v3.projects-a.plygrnd.tech/api
AUDION_API_TOKEN=audion_<hex>          # aus audion-v3 Settings / Tokens
```

`PLEXON_SERVICE_SECRET` muss **identisch** auf audion-v3 und checkion-v3 (live federation) sein.

Nach Env-Änderung: **Redeploy** plexon-v3.

## Readiness-Check

```bash
# eingeloggt (Session-Cookie) oder:
curl -fsS -H "Cookie: …" \
  https://plexon-v3.projects-a.plygrnd.tech/api/assistant/event-quick-check/readiness
```

Erwartung: `{ "ready": true, "blockers": [] }`.  
Wenn `ready: false`: Banner auf `/event-quick-check` listet die Blocker.

Admin-Probes (optional):

- `GET /api/services/checkion/status`
- `GET /api/services/audion/status`

## Manuelle Smoke-Checkliste

1. [ ] Nav → **Quick Check** öffnet `/event-quick-check` (kein 404)
2. [ ] Kein gelbes Readiness-Banner (oder nach Env-Fix verschwunden)
3. [ ] URL eingeben (z. B. öffentliche Marketing-Site) → **Analyse starten**
4. [ ] Unternehmensprofil bestätigen
5. [ ] Wettbewerber bestätigen (Komplettscan) **oder** Quick-Pfad ohne Deep-Scan-Wartezeit
6. [ ] GEO-Fragen bestätigen
7. [ ] Report-Dashboard erscheint (Ampel / Persona / GEO)
8. [ ] PDF und/oder PPTX Download funktioniert
9. [ ] Verlauf öffnet den Run erneut (`?run=`)

## Wenn es „fehlt“

| Symptom | Ursache |
|---------|---------|
| Nav-Eintrag fehlt | falsches Deploy-Repo / alter Build — Code hat Nav in `AppShell` |
| Seite lädt, Start scheitert still | fehlende `CHECKION_API_*` / `AUDION_API_*` |
| Banner zeigt Prod-URL | `CHECKION_API_URL` nicht auf checkion-v3 gesetzt |
| Persona-Schritt fail | `AUDION_API_TOKEN` oder Secret mismatch |

Siehe auch: `knowledge/plexon-event-quick-check-workflow.md`, `knowledge/coolify-plexon-v3-env-cheatsheet.md` § Wave B EQC.
