# Assistant Playbook — Persona Website Audit

**Status:** Accepted — Wave 2 (2026-09-02)  
**Depends:** Wave 1 persona page relevance, `plexon-assistant-phase2-playbooks.md`

## Goal

One-shot playbook:

> *„Website-Audit für Persona Sandra“*

Delivers: persona summary, ranked pages, top issues on top-3 URLs, optional GEO question teaser.

## Playbook id

`persona_website_audit`

## Steps

| Step | Action |
|------|--------|
| 1 | Resolve persona (AUDION catalog) |
| 2 | Resolve CHECKION deep scan |
| 3 | Corpus pages + rank (Wave 1/2 ranker) |
| 4 | For top 3 `scanId`: fetch `scan_overview` + issue counts |
| 5 | Optional: 3 persona GEO questions (existing synthesize helper) |
| 6 | Compose playbook report UI |

## Intent routing

Patterns:

- `website audit` + persona
- `audit für persona`
- `touchpoint audit`

Requires Collection context.

## UI

Reuse:

- `buildPersonaPageRelevanceLayout`
- `build-playbook-report-ui.ts` sections for issues + GEO teaser

## Out of scope

- Starting new scans without confirmation
- Full GEO job execution (link only)

## Tests

- Intent → `run_playbook` with `playbookId: persona_website_audit`
- Mock CHECKION → report contains ≥3 URLs all from corpus
