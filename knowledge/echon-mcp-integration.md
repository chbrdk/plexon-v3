# ECHON MCP — PLEXON Integration

**Status:** Phase 2 implementiert (Assistant Planner + Orchestrator).

Vollständiger Plan: [msqdx-echon/v2/knowledge/echon-mcp-plexon-integration-plan.md](../../msqdx-echon/v2/knowledge/echon-mcp-plexon-integration-plan.md)

## Env (PLEXON)

```env
ECHON_MCP_URL=http://echon-mcp:3101
ECHON_API_URL=http://echon-v2-api:8000
ECHON_SERVICE_TOKEN=…
```

ECHON-MCP wird aktiv, wenn `ECHON_MCP_URL` gesetzt ist und der Nutzer CHECKION- oder AUDION-Entitlement hat.

## Geänderte Dateien

| Datei | Zweck |
|-------|--------|
| `lib/constants.ts` | `getEchonMcpUrl()`, `ECHON_MCP_BADGE_ID` |
| `lib/paths/echon-api.ts` | Zentrale API-Pfade |
| `lib/integrations/echon-connectivity.ts` | Health-Probe, System-Prompt-Block |
| `lib/assistant/tool-catalog.ts` | `echon_research`, `echon_signals`, `echon_waves` |
| `lib/assistant/assistant-planner.ts` | Intents `echon_market`, `echon_audience` |
| `lib/assistant/orchestrator-complete.ts` | Drittes MCP |
| `lib/assistant/assistant-agent.ts` | `useEchonMcp` |
| `lib/assistant/handlers/free-chat.ts` | Entitlement-Gate |
| `lib/assistant/system-prompt.ts` | Cross-product Guidance |

## Vollständige Anleitung

**→ [echon-mcp-vollstaendige-anleitung.md](./echon-mcp-vollstaendige-anleitung.md)** (Deploy, Env, Playbook, Troubleshooting)

Phase 3 Playbook ist implementiert: `market_to_audience`.
