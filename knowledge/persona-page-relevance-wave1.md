# Persona → Page Relevance — Wave 1 tasks

**Spec:** `specs/domain/assistant-persona-page-relevance.md`  
**CHECKION API:** `checkion-v3/specs/api/domain-scan-pages.md`  
**Demo target:** Vaillant UC1 — Sandra (Altbau) on B2C domain scan

## Task order

### CHECKION v3

| # | Task | Status |
|---|------|--------|
| C1 | Contract types | done |
| C2 | Route handler | done |
| C3 | Service | done |
| C4 | Paths | done |
| C5 | Tests | done |
| C6 | MCP tool | done |
| C7 | Spec inventory | done |

### Plexon v3

| # | Task | Status |
|---|------|--------|
| P1 | CHECKION client helper | done |
| P2 | Paths | done |
| P3 | Planner / intent router | done |
| P4 | Handler | done |
| P5 | UI builder | done |
| P6 | Workflow registry | done |
| P7 | Tests | done |
| P8 | Demo doc | done (vaillant-group-mafo-demo.md) |
| P9 | Paths knowledge | done |

## Demo script (staging)

1. Collection [Vaillant Group](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173)
2. Ensure CHECKION B2C deep scan completed (`vaillant.de/produkte/waermepumpen/` spine)
3. Assistant: *„Welche Seiten auf vaillant.de sind für Sandra (Altbau-Eigenheimbesitzerin) besonders relevant — mit den wichtigsten CHECKION-Metriken?“*
4. Expect: ranked table, links to `/results/{scanId}/overview`, persona cited from AUDION

## Wave 2 (later)

- Port AUDION `site-topics` to audion-v3 (tag overlap signal)
- Implement CHECKION `classifyPageWithLlm` for richer tags
- Optional pre-score: tag overlap × persona keyword set before LLM rank
