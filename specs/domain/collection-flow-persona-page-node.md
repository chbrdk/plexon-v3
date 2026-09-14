# Collection Flow — persona_page_relevance node

**Status:** Accepted — Wave 2 (2026-09-02)  
**Depends:** `assistant-persona-page-relevance.md`, `collection-test-flow.md`, Wave 23 EQC node patterns

## Goal

Run persona→page ranking **on the board** (not only Assistant chat), persist ranked URLs in flow run context for downstream nodes (CREATION, human_confirm, report).

## Node kind

`persona_page_relevance`

| Port | Direction | Notes |
|------|-----------|-------|
| `in` | control in | after `domain_scan` |
| `then` | control out | default |
| catalog | `persona.*`, `checkion.pages` | ranked top-K snapshot |

### Config (node data)

```typescript
{
  personaId?: string
  personaName?: string   // match AUDION catalog if id omitted
  topK?: number          // default 8
  urlHint?: string       // optional override host
}
```

## Executor

Reuse `runPersonaPageRelevance()` from `lib/integrations/persona-page-relevance-client.ts`.

Write to run context:

```typescript
personaPageRanking: {
  personaId, personaName, domainScanId,
  items: Array<{ url, scanId, overallScore, relevanceTier, rationale }>
}
```

## Template wiring

**`vaillant-barrier-research-v1`:**  
`domain_scan` → `persona_page_relevance` → (existing BRANDION / report spine)

Optional: `human_confirm` showing top-5 table before continue.

## UI

- Board node label: „Relevante Seiten (Persona)“
- Run detail: compact table (reuse `buildPersonaPageRelevanceLayout` blocks)

## Acceptance

- **MUSS** fail with clear step error if no completed domain scan (same as assistant).
- **MUSS NOT** invent URLs not in CHECKION corpus response.

## Tests

- Flow template includes node after domain_scan
- Executor with fixture bindings writes context
