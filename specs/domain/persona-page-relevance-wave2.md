# Persona → Page Relevance — Wave 2

**Status:** Accepted — planning (2026-09-02)  
**Depends:** Wave 1 `assistant-persona-page-relevance.md`, CHECKION `domain-scan-pages.md`  
**Roadmap:** `knowledge/persona-page-relevance-wave2-roadmap.md`

## Goal

Improve ranking quality, demo reliability (Vaillant MaFo), and product surface (Flow node + Playbook) without inventing a second page model.

## Ranking pipeline (v2)

```
Persona (AUDION)
  + Site topics (AUDION ← CHECKION tags)
  + Knowledge Pack keywords (research_brief)
  + Corpus pages (CHECKION domain-scans/:id/pages)
  → pre-score (deterministic)
  → optional Sonnet rationales (metrics immutable)
  → UI table + flow context
```

### Signal weights (default)

| Signal | Weight | Source |
|--------|--------|--------|
| URL/token overlap persona name/role | 0.35 | Wave 1 heuristic |
| Site-topics tag overlap | 0.30 | W2-A |
| Knowledge Pack hypothesis terms | 0.20 | Collection KP |
| Classification tag overlap | 0.10 | W2-B |
| Richness bonus (summary present) | 0.05 | CHECKION |

**SOLANGE** site-topics unavailable, **MUSS** weights redistribute to URL + KP (no failure).

### LLM rationales (optional)

- Env: `ASSISTANT_PERSONA_PAGE_LLM=1`
- Model: Sonnet (board-grade); Haiku **not** for final rationale JSON
- Input: frozen metrics + persona fields + pre-score order
- Output: `{ rows: [{ scanId, rationale }] }` — URLs must ⊆ input

## Corpus pagination

- Fetch pages in loops of 100 until `page >= totalPages` or cap **500** pages (Wave 2)
- UI **MUSS** `corpusTruncated` anzeigen wenn cap hit
- Pre-filter: when site-topics present, only pages whose URL host/path appears in topic URL sample set (if CHECKION exposes per-tag URLs later; interim: tag overlap on page classification only)

## Journey (Wave 2H — optional)

After top-1 page:

- CTA: „UX-Journey auf dieser URL starten“ → existing Audion UX Journey agent
- Display findability tier when CHECKION overview includes `pageIndex` (contract extension deferred)

## Assistant polish (Wave 2G)

- `metadata.followUpPrompts` after success:
  - „Top-Seite im Journey testen“
  - „GEO-Fragen für {persona}“
  - „Website-Audit Playbook starten“
  - „Domain-Scan in CHECKION öffnen“

## Tests

- Ranking with site-topics fixture boosts tagged URLs
- KP keyword „Förderung“ boosts `/foerderung/` path in fixture
- LLM off → deterministic rationales unchanged from Wave 1
