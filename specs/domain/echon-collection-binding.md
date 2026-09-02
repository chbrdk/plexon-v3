# ECHON Collection binding (Wave 2)

**Status:** Accepted — implemented — 2026-09-02  
**Owner:** PLEXON v3 + ECHON v3  
**Companions:**  
- `specs/domain/collection-projects.md`  
- `specs/domain/collection-memory-wave1.md`  
- `specs/domain/collection-knowledge-pack.md`  
- `specs/domain/assistant-echon-mcp.md`  
- `echon-v3/v3/specs/domain/echon-collection-binding.md` (product SoT)  
- `echon-v3/v3/specs/domain/collection-knowledge-publish.md`  
- `echon-v3/v3/specs/adr/0032-echon-chatgpt-agent.md`

## Goal

Optional **Collection capability** for ECHON so market-intelligence distillates are shared like Audion `research_brief`, while ECHON keeps corpus SoT locally.

## Locked scope

| Layer | SoT |
|-------|-----|
| Signals, waves, research threads | ECHON Postgres |
| Chat sessions | ECHON Postgres (ADR 0032) |
| Cross-product brief | Plexon Knowledge Pack facet **`market_intelligence`** |
| Live Q&A in Assistant | ECHON MCP tools (unchanged) |

## Facet: `market_intelligence`

| Field | Notes |
|-------|-------|
| `summary` | Plain ≤2k chars |
| `topics` | Theme keywords |
| `briefingRefs` | `{ briefingId, title, url }[]` |
| `waveHighlights` | Short bullet list |
| `sourceThreadId` | ECHON research thread id |

**Non-goals:** Full signal dumps, chat transcripts, ingest controls in pack.

## Federation (implemented)

1. Optional `echon` row in `platform_project_product_bindings` — Collection-scoped (`externalProjectId` = Collection id, `in_sync`); **no** product upsert.
2. ECHON service publish: `POST …/knowledge/facets/market_intelligence/publish` (GET revision first).
3. Plexon EQC / Assistant: distill into pack; Assistant `buildCompactProjectContextBlock` reads `research_brief` + `market_intelligence`.

## Acceptance

- [x] Facet in pack taxonomy + publish ownership `echon`
- [x] ECHON chat Postgres persistence (ADR 0032)
- [x] ECHON post-`research_ask` soft publish
- [x] Assistant / Collection UI consume
