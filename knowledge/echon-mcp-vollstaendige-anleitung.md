# ECHON + PLEXON — Vollständige Integrationsanleitung

**Stand:** 2026-06-16  
**Repos:** `msqdx-echon`, `PLEXON`, `AUDION-v2`, `CHECKION`

Diese Anleitung beschreibt End-to-End: ECHON MCP deployen, PLEXON verdrahten, Playbook nutzen, testen.

---

## 1. Architektur

```
Nutzer → PLEXON Assistant
           ├─ CHECKION MCP (Site, Scans, GEO)
           ├─ AUDION MCP (Personas, Zielgruppen, Chat)
           └─ ECHON MCP (Markt-Signale, Waves, Research)
                 └─ ECHON FastAPI (echon-v2-api:8000)
```

**Playbook „Markt → Zielgruppen“** (deterministisch, ohne LLM-Tool-Loop):

1. CHECKION-Projektkontext (Kurzinfo)
2. ECHON Research (`POST /api/v2/research/runs`, Poll `GET /threads/{id}`)
3. AUDION `POST /target-groups` (2 Zielgruppen aus Markt-Findings)

---

## 2. ECHON Stack (Coolify)

### 2.1 Service `echon-mcp` deployen

**Repo:** `msqdx-echon`  
**Compose:** `v2/infrastructure/docker-compose.echon-v2.coolify.yml` (Service `echon-mcp`)  
**Dockerfile:** `Dockerfile.mcp-server` (Repo-Root)

| Variable | Wert |
|----------|------|
| `ECHON_API_URL` | `http://echon-v2-api:8000` |
| `ECHON_SERVICE_TOKEN` | optional Bearer |
| `MCP_STATELESS` | `true` |
| `MCP_PORT` | `3101` |

**Wichtig:** `ECHON_API_URL` = **FastAPI**, nicht die Next.js-Web-URL (sonst HTML/500).

### 2.2 Smoke-Test MCP

```bash
curl -sS https://mcp-echon.<deine-domain>/
# → {"status":"ok","service":"echon-mcp"}

curl -sS -X POST https://mcp-echon.<deine-domain>/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echon.health","arguments":{}}}'
```

Erwartung: JSON mit `status: ok` (kein `service: web`).

```bash
curl -sS -X POST … -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echon.signals_list","arguments":{"limit":3}}}'
```

---

## 3. PLEXON (Coolify)

### 3.1 Pflicht-Env (bestehend)

| Variable | Zweck |
|----------|--------|
| `AUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL` | Auth |
| `ANTHROPIC_API_KEY` | Assistant |
| `CHECKION_API_URL` + `CHECKION_API_TOKEN` | REST |
| `AUDION_API_URL` + `AUDION_API_TOKEN` | REST (`http://audion-api:8000` oder `…/api`) |

### 3.2 Neu: ECHON + MCP

| Variable | Wert (intern empfohlen) |
|----------|-------------------------|
| `ECHON_MCP_URL` | `http://echon-mcp:3101` |
| `ECHON_API_URL` | `http://echon-v2-api:8000` |
| `ECHON_SERVICE_TOKEN` | wie ECHON-Stack |

| Variable | Wert |
|----------|------|
| `CHECKION_MCP_URL` | `http://checkion-mcp:3100` |
| `AUDION_MCP_URL` | `http://audion-mcp:3100` |

ECHON-MCP im Assistant ist aktiv wenn:

- `ECHON_MCP_URL` gesetzt **und**
- Nutzer CHECKION- oder AUDION-Entitlement hat

### 3.3 Netzwerk

PLEXON, `echon-mcp`, `echon-v2-api`, `audion-mcp`, `checkion-mcp` müssen im **gleichen Coolify-Projekt/Netz** erreichbar sein (interne Service-Namen).

---

## 4. Nutzung im Assistant

### 4.1 Free-Chat (MCP, Planner)

| Prompt | Verhalten |
|--------|-----------|
| „Was passiert am Markt für Versicherungen?“ | Intent `echon_market` → Signals/Research |
| „Markttrends recherchieren und Zielgruppen anlegen“ | Intent `echon_audience` + Write-Tools |

Schreib-Tools mit Bestätigung: `echon_research_run_start`, `audion_target_group_create`.

### 4.2 Playbook (deterministisch)

**Trigger-Prompts:**

- „Markt → Zielgruppen für Rheinland Versicherungen“
- „ECHON Markttrends und Zielgruppen in AUDION anlegen“
- „Market to audience …“

**Voraussetzungen:**

- Gespräch mit **Projektkontext** (platformProjectId)
- **audionProjectId** gebunden (AUDION-Sync)
- `ECHON_API_URL` auf PLEXON für Research-Poll

**Ablauf (~5–10 Min, depth=fast):**

1. Vorbereitung (Query aus Projektname/Domain)
2. CHECKION-Kurzinfo (optional)
3. ECHON Research + Poll
4. 1–2 AUDION-Zielgruppen aus `key_findings`

---

## 5. MCP-Tool-Referenz (Phase 1)

| Tool | Beschreibung |
|------|----------------|
| `echon.health` | API-Health |
| `echon.signals_list` / `echon.signal_get` | Markt-Signale |
| `echon.waves_list` / `echon.wave_get` | Topic-Cluster |
| `echon.research_chat` | Sync, kurz (30–120s) |
| `echon.research_run_start` | Async (Minuten) |
| `echon.research_run_status` | Run-Status |
| `echon.research_thread_get` | Ergebnis + Citations |

---

## 6. Fehlerbehebung

| Symptom | Ursache | Fix |
|---------|---------|-----|
| MCP `HTML` / 500 | `ECHON_API_URL` → Web | `http://echon-v2-api:8000` |
| `echon.health` → `service: web` | wie oben | FastAPI-URL |
| Keine ECHON-Tools im Chat | `ECHON_MCP_URL` fehlt | Env auf PLEXON |
| Playbook: audionProjectId fehlt | Kein AUDION-Binding | Projekt syncen |
| `echon_poll_timeout` | Research > 10 Min | ECHON Celery prüfen; später erneut |
| `AUDION_API` HTML | Web statt API | `AUDION_API_URL=http://audion-api:8000` |

Siehe auch: `AUDION-v2/knowledge/troubleshooting-persona-target-group-create.md` (MCP-URL-Muster).

---

## 7. Tests (lokal)

```bash
# ECHON MCP
cd msqdx-echon/mcp-server && npm test

# PLEXON
cd PLEXON && npm test -- --run __tests__/market-to-audience.test.ts __tests__/assistant-planner.test.ts
```

---

## 8. Datei-Index

| Bereich | Pfad |
|---------|------|
| ECHON MCP | `msqdx-echon/mcp-server/` |
| ECHON Plan | `msqdx-echon/v2/knowledge/echon-mcp-plexon-integration-plan.md` |
| ECHON URLs | `msqdx-echon/v2/knowledge/echon-urls-and-paths.md` |
| PLEXON ECHON paths | `PLEXON/lib/paths/echon-api.ts` |
| Playbook Runner | `PLEXON/lib/assistant/playbooks/run-market-to-audience.ts` |
| Playbook Handler | `PLEXON/lib/assistant/handlers/run-playbook.ts` |
| Coolify Env | `PLEXON/knowledge/coolify-env-variablen.md` |

---

## 9. Checkliste Go-Live

- [ ] `echon-mcp` healthy (`wget localhost:3101`)
- [ ] `echon.health` via MCP → FastAPI JSON
- [ ] PLEXON: `ECHON_MCP_URL` + `ECHON_API_URL` gesetzt
- [ ] PLEXON: `AUDION_API_URL` + Token (Zielgruppen-Anlage)
- [ ] Testprojekt mit `audionProjectId` im PLEXON-Kontext
- [ ] Prompt: „Markt → Zielgruppen für &lt;Projekt&gt;“
- [ ] Optional Free-Chat: „Markt für Versicherungen?“
