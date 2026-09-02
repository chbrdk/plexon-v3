# Collection Memory — Wave 1 (shared distillates)

**Status:** Accepted — implementing — 2026-09-02  
**Owner:** PLEXON v3  
**Companions:**  
- `specs/domain/collection-knowledge-pack.md`  
- `specs/domain/central-assistant-flyout.md`  
- `specs/domain/collection-test-flow.md`  
- `knowledge/vaillant-group-mafo-demo.md`  
- `specs/domain/echon-collection-binding.md` (Wave 2)

## Goal

Make **research and chat outcomes** reusable across Plexon Assistant and product apps **without** a unified chat database. Wave 1 uses the existing **Collection Knowledge Pack** (`research_brief` sections) plus Plexon Assistant report publish.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Shared store | Collection Knowledge Pack on `platformProjectId` |
| Chat transcripts | **Never** in the pack (Non-Goal) |
| Assistant full history | Stays in `assistant_conversations` / `assistant_messages` |
| Cross-app read | Pull-on-use from pack + Assistant MCP / embed |
| Wave 1 transport | **`research_brief.sections[]`** with stable section ids |
| Wave 2 | Optional dedicated facets (`assistant_insights`, `market_intelligence`) |

## Section id registry (Wave 1)

| Section id | Source | Replaced on |
|------------|--------|-------------|
| `collection-test-flow-latest` | Generic Collection Test Flow verdict | Each flow complete |
| `vaillant-uc1-flow-latest` | Vaillant UC1 template run | Each UC1 complete |
| `vaillant-uc2-flow-latest` | Vaillant UC2 template run | Each UC2 complete |
| `assistant-report-latest` | Plexon Assistant curated report | Each report generate (when Collection bound) |
| `flow-report-latest` | Collection Flow curated report (pinned outputs) | Each flow report generate |

Section shape = existing `ResearchSection` (`id`, `title`, `plainText`, `bullets?`).

## Publish paths

### 1. Collection Test Flow → pack

After successful flow execute (`lib/collection-flow-execute.ts`), best-effort:

- `distillCollectionFlowToKnowledgePack()` merges generic + template-specific sections into `research_brief`.
- Run success does **not** depend on distillate (same as Wave 4).

### 2. Assistant report → pack

When `POST …/assistant/conversations/:id/reports/generate` succeeds **and** the conversation has `platformProjectId`:

- `distillAssistantReportToKnowledgePack()` merges `assistant-report-latest`.
- Response includes `knowledgePackPublished: boolean`.

Opt-out: body `{ "publishToCollection": false }`.

### 3. Flow report pins → pack

When `POST …/flows/:flowId/reports/generate` succeeds: merge section `flow-report-latest` (opt-out `publishToCollection: false`). Spec: `collection-flow-report-pins.md`.

### 4. Audion research (unchanged)

Autosync distillate via `POST …/knowledge/facets/research_brief/publish` — see `audion-v3/specs/domain/knowledge-pack-publish.md`.

## Consumers

| Consumer | How |
|----------|-----|
| Plexon Assistant | Already hydrates Knowledge Pack for Collection context |
| CHECKION / CREATION / BRANDION | Pull `research_brief` on use |
| Audion persona chat | Product-local; may read pack for RAG seed (unchanged) |

## Non-goals (Wave 1)

- Unified conversation API across Audion / ECHON / Plexon
- Audion persona chat auto-publish
- ECHON Collection binding (Wave 2 — `echon-collection-binding.md`)
- Dedicated `assistant_insights` facet table (Wave 2 optional split)

## Acceptance

1. Vaillant UC1/UC2 flow complete → `research_brief` contains `vaillant-uc*-flow-latest` with verdict summary.
2. Assistant report on Vaillant Collection → `assistant-report-latest` section appears in pack.
3. Generic flows still write `collection-test-flow-latest`.
4. Unit tests cover section builders and merge ids.
