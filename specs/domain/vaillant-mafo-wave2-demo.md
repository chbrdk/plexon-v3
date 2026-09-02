# Vaillant MaFo — Wave 2 demo hardening

**Status:** Accepted — Wave 2 (2026-09-02)  
**SSOT:** `knowledge/vaillant-group-mafo-demo.md` · `lib/demo/vaillant-group-mafo.ts`

## Goal

Demo works **without manual CHECKION steps**: B2C corpus for UC1, B2B spine for UC2, Assistant persona→pages on staging after container boot.

## URLs (unchanged)

| Spine | URL |
|-------|-----|
| UC1 B2C | `https://www.vaillant.de/produkte/waermepumpen/` |
| UC2 B2B | `https://www.myvaillantpro.de/` (Fachpartner redirect) |

## Bootstrap additions (D2–D3)

Extend `ensureVaillantGroupMafoBootstrap()` (or dedicated `ensureVaillantCheckionCorpus()`):

1. Resolve CHECKION mirror project id for Collection `f3d27e9f-d14c-4880-82be-3ca31c051173`.
2. **UC1:** If no completed domain scan whose root URL host is `vaillant.de` with `pageCount >= 5`, start deep scan (maxPages staging default e.g. 30) and poll until `completed` or timeout with log.
3. **UC2:** Same for B2B host (`myvaillantpro.de` or configured UC2 URL).
4. Idempotent: reuse any completed scan with `pageCount >= minPages` (any age). New scan only when missing or `--force-corpus-refresh` / `VAILLANT_MAFO_CORPUS_FORCE_REFRESH=1`. Optional max age via `freshMs` (default: none).

## Flow readiness (D4)

`run-vaillant-group-mafo-flow.ts --if-pending` **MUSS** CHECKION spine status `completed` before marking flow run success when step includes `domain_scan`.

## Assistant demo copy (D5)

**UC1:** (existing Sandra question)

**UC2:**

> *Welche Seiten sind für **Klaus** (Heizungsbaumeister) besonders relevant — CHECKION-Metriken auf dem Fachpartner-Spine?*

## Cross-capability (W2-I)

| After ranking | Action |
|---------------|--------|
| CREATION | Deep link editor `platformProjectId` + query `insightUrl={topUrl}` (scene `scene-vaillant-landing`) |
| BRANDION | Link Brand Measure on top URL (existing CHECKION single/deep handoff) |
| Knowledge Pack | Optional facet `persona_page_ranking` snapshot JSON for demo reset |

## Operator visibility (D6)

Bootstrap logs:

```
[vaillant-mafo] CHECKION B2C corpus: domain-{id} completed pages=42
[vaillant-mafo] CHECKION B2B corpus: …
```

## Tests

- Mock CHECKION list → triggers scan start once
- Second bootstrap → no duplicate when completed scan exists
