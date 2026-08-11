# PLEXON Assistant Orchestrator

Stand: Juni 2026

## Übersicht

Der **Assistent** ist der user-facing Orchestrator-Chat in PLEXON. **Primäreinstieg** ist das Cross-App-Flyout (`/assistant/embed` in `ChatOverlay`); **`/assistant`** ist Expand derselben Conversation. Er ermöglicht:

- Konversation mit Claude (Anthropic)
- PLEXON-first Projektanlage + Sync zu CHECKION/AUDION
- Paralleles Research (REST-Clients)
- MCP-Steuerung von CHECKION/AUDION/ECHON/BRANDION (wenn Entitlements + MCP-URLs aktiv)
- Projektstatus / Dashboard-Zusammenfassungen

Siehe `specs/domain/central-assistant-flyout.md` · `knowledge/central-assistant-flyout.md`.

## Routen & Konstanten

| Pfad | Konstante |
|------|-----------|
| `/assistant` | `PATH_ASSISTANT` (expand) |
| `/assistant/embed` | `PATH_ASSISTANT_EMBED` (flyout iframe) |
| `/assistant?c=<conversationId>` | `pathAssistantChat(id)` — Deep-Link zum Fortsetzen |
| `pathAssistantEmbed(query)` | Embed + product/project/context query |
| `POST /api/assistant/complete` | `API_ASSISTANT_COMPLETE` |
| `GET/POST /api/assistant/conversations` | `API_ASSISTANT_CONVERSATIONS` |
| `GET /api/assistant/conversations/:id` | `apiAssistantConversation(id)` |
| `GET/POST .../conversations/:id/messages` | `apiAssistantConversationMessages(id)` |
| `GET .../workflows/:runId/stream` | `apiAssistantWorkflowStream(runId)` |
| `POST /api/platform/companies/:id/platform-projects` | `apiPlatformCompanyPlatformProjects(companyId)` |
| `POST /api/platform/projects/:id/sync` | `apiPlatformProjectSync(id)` |

Zentrale URLs für externe APIs: `lib/paths/checkion-api.ts`, `lib/paths/audion-api.ts`, `lib/paths/external-apis.ts`.

## Umgebungsvariablen

| Variable | Zweck |
|----------|--------|
| `ANTHROPIC_API_KEY` | LLM |
| `ANTHROPIC_ASSISTANT_MODEL` | Optional, Default Sonnet 4.6 |
| `ANTHROPIC_PLANNER_MODEL` | Optional, Default Haiku 4.5 (Tool-Planung) |
| `DATABASE_URL` | Conversations, Messages, Workflow-Runs |
| `CHECKION_MCP_URL` / `AUDION_MCP_URL` / `ECHON_MCP_URL` / `BRANDION_MCP_URL` | MCP Tool-Loop |
| `CHECKION_API_URL` + `CHECKION_API_TOKEN` | Research REST |
| `AUDION_API_URL` + `AUDION_API_TOKEN` | Research REST |
| `PLEXON_SERVICE_SECRET` | Federation / Dashboard-Fetch |
| `ANTHROPIC_ASSISTANT_THINKING_BUDGET` | Extended Thinking (Default `4096`; `0`/`off` deaktiviert) |
| `ASSISTANT_DOMAIN_SCAN_MAX_PAGES` | Max. Seiten pro Domain Deep Scan (Default `50`, max `500`) |
| `MOZILLA_OBSERVATORY_API_BASE` | Optional Override Mozilla HTTP Observatory API |
| `CLOUDFLARE_DNS_QUERY_URL` | Optional Override Cloudflare DNS-over-HTTPS |
| `W3C_VALIDATOR_URL` | Optional W3C Nu-Validator (Phase 2+ External) |

Vollständige Coolify-Liste inkl. MCP und Mail: **`knowledge/coolify-env-variablen.md`**.

## Datenbank

- `assistant_conversations`
- `assistant_messages`
- `assistant_workflow_runs`

Schema: `lib/db/schema.ts`. Push: `npm run db:push`.

## Chat-Verlauf (UI)

- Sidebar links (Desktop) bzw. Drawer (Mobile): `components/assistant/AssistantConversationHistory.tsx`
- Liste via `GET API_ASSISTANT_CONVERSATIONS`, Auswahl lädt Messages + Report-Pins + Projektkontext
- **Neuer Chat** setzt State zurück; URL ohne Query-Param
- Aktiver Chat: `pathAssistantChat(conversationId)` → `/assistant?c=<id>` (Bookmark / Reload)
- Suche (aufklappbar), Umbenennen (`PATCH apiAssistantConversation(id)`), Löschen (`DELETE`, Cascade auf Messages/Pins)
- Desktop: einklappbare Sidebar (`ASSISTANT_HISTORY_COLLAPSED_STORAGE_KEY` in localStorage), 220px / 44px Rail

## Workflows

Intent-Handler leben in `lib/assistant/handlers/`; Dispatch über `lib/assistant/workflow-registry.ts` (lazy-loaded). `complete-handler.ts` kümmert sich nur um Auth, Konversation, Kontext und Registry-Aufruf.

| Workflow | Handler | Typ |
|----------|-------|-----|
| Projekt anlegen + Sync | `handlers/create-platform-project.ts` | `create_platform_project` |
| Projekt nur in AUDION | `handlers/create-product-project.ts` | `create_audion_project` |
| Projekt nur in CHECKION | `handlers/create-product-project.ts` | `create_checkion_project` |
| Quick-Scan (Accessibility) | `handlers/quick-scan.ts` | `quick_scan` |
| PageSpeed | `handlers/pagespeed-check.ts` | `pagespeed_check` |
| GEO / E-E-A-T | `handlers/geo-analysis.ts` | `geo_analysis` |
| SSL-Check | `handlers/ssl-check.ts` | `ssl_check` |
| Wayback | `handlers/wayback-check.ts` | `wayback_check` |
| Domain Deep Scan | `handlers/domain-scan.ts` | `domain_scan` |
| Kontrast-Check | `handlers/contrast-check.ts` | `contrast_check` |
| Lesbarkeit | `handlers/readability-check.ts` | `readability_check` |
| Scan-Zusammenfassung | `handlers/scan-summarize.ts` | `scan_summarize` |
| Website-Audit Playbook | `handlers/run-playbook.ts` | `website_audit` |
| Launch Readiness Playbook | `handlers/run-playbook.ts` | `launch_readiness` |
| Mozilla Observatory (Security Headers) | `lib/integrations/external/mozilla-observatory-client.ts` | optional in `website_audit` |
| DNS DoH Check | `lib/integrations/external/dns-doh-client.ts` | optional in `website_audit` |
| Persona-Bootstrap | `handlers/persona-bootstrap.ts` | `persona_bootstrap` |
| Journey Outline | `handlers/journey-outline.ts` | `journey_outline` |
| Journey generieren | `handlers/journey-generate.ts` | `journey_generate` |
| Sync-Diagnose | `handlers/sync-diagnose.ts` | `sync_diagnose` |
| Paralleles Research | `handlers/start-research.ts` | `parallel_research` |
| Projekt-Zusammenfassung | `handlers/project-status.ts` | Intent `project_status` |
| Free Chat (Agent) | `handlers/free-chat.ts` | `free_chat` |

**Intent-Guards:** `lib/assistant/create-project-scope.ts` → `matchesCreateProjectIntent` / `isAudienceWorkflowIntent`. Prompts wie „CHECKION-Projekt ansehen und Zielgruppen für AUDION ableiten“ dürfen **nicht** in `create_*_project` laufen (früher: `audion` + `anlegen` Regex). Stattdessen `free_chat` + MCP-Tools (`checkion.*`, `audion.target_group_create`).

### Phase-2 Intent-Übersicht

| User-Beispiel | Intent | Async/Poll |
|---------------|--------|------------|
| `Website audit https://…` | `run_playbook` / `website_audit` | optional GEO-Step |
| `Launch readiness …` | `run_playbook` / `launch_readiness` | Research-Poll |
| `Deep scan https://…` | `domain_scan` | Domain-Status-Poll |
| `GEO Analyse https://…` | `geo_analysis` | GEO-Job-Poll |
| `SSL Check …` | `ssl_check` | — |
| `Wayback …` | `wayback_check` | — |
| `Kontrast #111 #eee` | `contrast_check` | — |
| `Lesbarkeit https://…` | `readability_check` | — |
| `Fasse den Scan zusammen` | `scan_summarize` | — |
| `Sync-Diagnose` | `sync_diagnose` | — |
| `Was kannst du?` | `capabilities` | — |

Detaillierter Umsetzungsplan (Epics 0–13): **`knowledge/plexon-assistant-phase2-playbooks.md`** (Referenz, nicht editieren).

## Auth

- Chat: eingeloggt (`getRequestUser`)
- Projekt anlegen: `canViewCompany` + aktives CHECKION- oder AUDION-Entitlement
- Projektkontext: `userCanViewPlatformProject`
- Destruktive MCP-Tools: Bestätigungskarte im Chat

## Kontext-Budget (Prompt-Limit)

MCP-Tool-Antworten (Scans, Knowledge-Chunks) können sehr groß sein. Der Assistent begrenzt daher:

| Limit | Datei | Wert |
|-------|-------|------|
| Tool-Ergebnis | `lib/assistant/context-budget.ts` | 48.000 Zeichen |
| Chat-Verlauf pro Message | `context-budget.ts` | 8.000 Zeichen, max. 20 Messages |
| Projektkontext (System) | `lib/assistant/project-context.ts` | 24.000 Zeichen |

Bei aktivem Projektkontext lädt `buildCompactProjectContextBlock` eine Kurzfassung (CHECKION Research-Snapshot, AUDION Knowledge-Titel/Snippets) in den System-Prompt – statt dass Claude alles per MCP nachlädt.

## Planner-Agent (Free Chat)

Free-Chat-Anfragen laufen über `runAssistantAgent` (`lib/assistant/assistant-agent.ts`):

1. **Plan** – `assistant-planner.ts`: Heuristik (Intent, Tool-Familien, max. Runden); bei unklarem `general_chat` + Projektkontext optional LLM-Plan (Haiku).
2. **Execute** – `orchestrator-complete.ts` mit gefilterten MCP-Tools (`tool-catalog.ts` Familien).
3. **Antwort** – Claude synthetisiert aus eingebettetem Projektkontext + Tool-Ergebnissen.

**Retrieval** (`knowledge-retrieval.ts`): Vor der Ausführung werden bei Wissens-Intents relevante AUDION/CHECKION-Quellen per Keyword-Scoring geladen und in den System-Prompt injiziert. Zusätzlich: semantische Expansion über AUDION `knowledge/chunks/{id}/similar` (Qdrant).

**Streaming** (`POST /api/assistant/complete/stream`): SSE-Events `phase`, `plan`, `retrieval`, `thinking`, `thinking_reset`, `token`, `token_reset`, `tool_call`, `done`, `error`. Claude-Antworten werden per Anthropic Stream API tokenweise an den Client gesendet; Extended Thinking (`thinking_delta`) wird live angezeigt und nach Antwortstart eingeklappt. Tool-Aufrufe erscheinen als `tool_call` (start/done).

**Env:** `ANTHROPIC_ASSISTANT_THINKING_BUDGET` (Default `4096`, `0`/`off`/`false` deaktiviert Extended Thinking).

Plan-Metadaten: `assistant_messages.metadata.planner`.

| Modus | Verhalten |
|-------|-----------|
| `embedded_context` | Keine MCP-Tools; Antwort aus Projektkurzinfo |
| `hybrid` | Kurzinfo zuerst, max. 2–4 gezielte Tool-Runden |
| `tools` | Gefiltertes Tool-Subset (z. B. nur Scan oder GEO) |

## Board vs. Assistent

- **Board** (`/board`): Admin-only, React Flow, volle MCP-Tool-Liste.
- **Assistent** (`/assistant`): Intent-Router + Workflows + Planner-Agent für Free Chat.

Gemeinsame Tool-Loop-Logik: `lib/assistant/orchestrator-complete.ts`.

## MCP Research Tools (optional)

- CHECKION: `checkion.project_research` in `CHECKION/mcp-server/src/tools.ts`
- AUDION: `audion.project_research_start` in `AUDION-v2/mcp-server/src/tools.ts`

PLEXON nutzt primär REST-Clients in `lib/integrations/` für deterministische Workflows.

## Workflow Insights (Post-Analyst)

Nach erfolgreichen Workflows (GEO, Scan, PageSpeed, Playbooks) hängt `enrichWorkflowLayout` (`lib/assistant/insights/`) **additiv** an:

1. **Rohdaten** — unveränderte `uiLayout`-Blöcke (Tabellen, Charts, Metriken)
2. **Quer-Benchmark** — bei GEO/Scan optional PageSpeed-Fetch (≤18s) als zusätzliche `metric_grid` + `chart`
3. **Deterministische Signale** — `cross-signals.ts` (Wettbewerb, GEO↔Research, Scan↔PSI, Playbook-Spread)
4. **LLM-Einschätzung** — Findings, Quervergleiche, Empfehlungen, Fazit (`finding_list`, `recommendation_list`, `alert`)

Deaktivieren: `ASSISTANT_WORKFLOW_INSIGHTS=off`

**Workflows mit Insight-Layer:** `geo_analysis`, `quick_scan`, `pagespeed_check`, `domain_scan`, `ssl_check`, `readability_check`, `website_audit`, `launch_readiness`

**Auto-Empfehlungen:** Jede Assistenten-Nachricht erhält `metadata.followUpPrompts` (max. 5) via `attachRecommendationsToMetadata` in `complete-handler.ts`. UI: `AssistantFollowUpChips` („Als Nächstes empfohlen“). Nach GEO z. B. SEO/PageSpeed, WCAG-Scan, Domain-Scan, Website-Audit — Klick startet Prompt, kein Auto-Job.


Strukturierte Assistant-Antworten via lokale `plexon_ui.*` Output-Tools und Atomic-Design-Renderer — siehe **`knowledge/plexon-assistant-generative-ui.md`**.

Deterministische Workflows liefern `metadata.uiLayout` mit MSQDX-Blöcken (`step_list`, `summary_card`, `metric_grid`, `data_table`, `persona_card`, …).

## Phase 2 (abgeschlossen, Juni 2026)

Playbooks, Async-Polling (GEO, Domain-Scan), CHECKION-Tool-Workflows, kostenlose Drittanbieter, Workflow-Registry — Plan: **`knowledge/plexon-assistant-phase2-playbooks.md`**.

**Sprint 1 (erledigt):** `poll-until`, GEO async + `deep`/competitive, SSL-Check, Wayback-Check, Playbook-Registry-Skeleton, erweiterte `checkion-api` Pfade.

**Sprint 2 (erledigt):** Domain Deep Scan (async poll), Kontrast + Lesbarkeit, Scan Summarize (Follow-up + Quick-Scan-Option).

**Sprint 3 (erledigt):** Website-Audit Playbook (`run_playbook` / `website_audit`) — verkettete Schritte + Gesamt-Report-UI.

**Sprint 4 (erledigt):** Launch Readiness Playbook (`run_playbook` / `launch_readiness`) — Cross-Product-Onboarding mit Ampel-Report; External APIs Mozilla Observatory + Cloudflare DNS DoH als optionale Website-Audit-Schritte.

**Sprint 5 / Epic 11 (erledigt):** Workflow-Registry — `lib/assistant/workflow-registry.ts` + `lib/assistant/handlers/*.ts`; `complete-handler.ts` nur Auth, Kontext und Registry-Dispatch.

**Sprint 5 / Epic 12 (erledigt):** Composer-Chips (Playbooks zuerst), Capabilities-UI Playbook-Sektion, CHECKION Auto-Assign (`auto-assign-checkion.ts`), Write-Confirm für Domain-Scan, GEO-Rerun und Journey-Start.

**Sprint 5 / Epic 13 (erledigt):** Orchestrator-Doku Phase-2-Tabelle, Generative-UI Playbook-Rezepte, E2E-Smoke (`website_audit`, `domain_scan`, `geo_poll`), Coolify-Env für Assistant Phase 2.
