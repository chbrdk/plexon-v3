# Persona → Seiten & MaFo Demo — Wave 2 Roadmap

**Wave 1 (shipped):** Corpus API (checkion-v3 `4dc7bce`), Assistant intent (plexon-v3 `89d83cc`)  
**Umbrella spec:** `specs/domain/persona-page-relevance-wave2.md`  
**Demo SSOT:** `knowledge/vaillant-group-mafo-demo.md`

Wave 2 turns Wave 1 from „Chat-Prototyp mit Heuristik“ into **demo-sichere Qualität** + **sichtbare Collection-Flows** + **Cross-Capability-Story** (AUDION ↔ CHECKION ↔ BRANDION ↔ CREATION).

---

## Epic overview

| Epic | Repo(s) | Outcome | Spec |
|------|---------|---------|------|
| **W2-A** Site topics v3 | audion-v3, checkion-v3 | Tag-Aggregation + Persona-Matching | `audion-v3/specs/domain/checkion-site-topics-v3.md` |
| **W2-B** Page classification LLM | checkion-v3 | `classification.tags` auf Corpus-Pages | `checkion-v3/specs/domain/page-classification-llm.md` |
| **W2-C** Ranking v2 | plexon-v3 | Topics + KP keywords + optional Sonnet rationales | `specs/domain/persona-page-relevance-wave2.md` § Ranking |
| **W2-D** Vaillant demo hardening | plexon-v3, checkion-v3 | B2C/B2B Deep Scan bootstrap, UC2 parity | `specs/domain/vaillant-mafo-wave2-demo.md` |
| **W2-E** Flow node | plexon-v3 | `persona_page_relevance` auf Collection Board | `specs/domain/collection-flow-persona-page-node.md` |
| **W2-F** Playbook Website-Audit | plexon-v3 | Persona → Seiten → Issues → GEO teaser | `specs/domain/assistant-persona-website-audit-playbook.md` |
| **W2-G** Assistant polish | plexon-v3 | Follow-ups, MCP v3 aliases, corpus pagination | `specs/domain/persona-page-relevance-wave2.md` § Assistant |
| **W2-H** Journey findability | audion-v3, plexon-v3 | Top-URL + UX-Journey overlay (optional) | `specs/domain/persona-page-relevance-wave2.md` § Journey |
| **W2-I** CREATION / BRANDION hooks | plexon-v3, brandion-v3 | Insight-Landing + Brand Measure nach Ranking | `specs/domain/vaillant-mafo-wave2-demo.md` § Cross-capability |
| **W2-J** Model policy (optional) | plexon-v3 | Haiku volume / Sonnet rank-only (revisit Claude-first) | `knowledge/claude-first-defaults-draft.md` (draft only) |

**Recommended build order:** D → A → B → C → E → F → G → H → I → J

---

## Task index (all epics)

### W2-D — Vaillant demo hardening (plexon-v3)

| ID | Task | Done when |
|----|------|-----------|
| D1 | Spec accepted | `vaillant-mafo-wave2-demo.md` |
| D2 | Bootstrap: ensure B2C deep scan on `vaillant.de/.../waermepumpen/` if missing | idempotent script + container boot |
| D3 | Bootstrap: ensure B2B spine URL for UC2 (myVaillant Pro / Fachpartner) | same pattern |
| D4 | `run-vaillant-group-mafo-flow` waits for CHECKION `completed` before marking UC ready | test + demo doc |
| D5 | Demo doc: UC2 assistant question for Klaus/Tim | `vaillant-group-mafo-demo.md` |
| D6 | Health check endpoint or bootstrap log line „B2C corpus ready“ | operator visibility |

### W2-A — Site topics v3 (audion-v3 + checkion-v3)

| ID | Task | Done when |
|----|------|-----------|
| A1 | Spec | `checkion-site-topics-v3.md` |
| A2 | audion-v3 `GET …/integrations/checkion/site-topics` | parity v2 response shape |
| A3 | Client: fetch corpus pages from v3 `domain-scans/:id/pages` (not v2 slim-pages) | uses classification |
| A4 | Aggregate `tag → page_count, weight_sum` | tests |
| A5 | MCP `audion.project_checkion_site_topics` on audion-v3 MCP (new) | optional Phase A5b |
| A6 | Plexon ranker consumes site-topics bundle | tag overlap boost |

### W2-B — Page classification LLM (checkion-v3)

| ID | Task | Done when |
|----|------|-----------|
| B1 | Spec | `page-classification-llm.md` |
| B2 | Implement `classifyPageWithLlm` | non-null on live single scan |
| B3 | Deep scan: `classifyPageTopics=true` persists tags on corpus rows | domain scan start flag |
| B4 | Corpus pages API returns tags for re-scanned jobs | integration test |
| B5 | Document re-scan operator note for legacy domains | `knowledge/paths.md` |

### W2-C — Ranking v2 (plexon-v3)

| ID | Task | Done when |
|----|------|-----------|
| C1 | Merge signals: heuristic + site-topics + Knowledge Pack `research_brief` keywords | scored pipeline |
| C2 | Optional Sonnet: rationales only (metrics frozen) | env `ASSISTANT_PERSONA_PAGE_LLM=1` |
| C3 | Paginate corpus >100 or pre-filter by tag overlap | no silent truncate without UI note |
| C4 | Issue overlay: weakest signal + top issue count per ranked row | CHECKION scan overview join |
| C5 | Tests with fixture tags + KP keywords | unit tests |

### W2-E — Flow node (plexon-v3)

| ID | Task | Done when |
|----|------|-----------|
| E1 | Spec | `collection-flow-persona-page-node.md` |
| E2 | Node kind `persona_page_relevance` in canvas + executor | Wave 23 pattern |
| E3 | Template hook on `vaillant-barrier-research-v1` after `domain_scan` | board runnable |
| E4 | Context output: ranked URLs + scanIds in flow run context | EQC-style adapter |
| E5 | Gallery / create from template documents step | knowledge |

### W2-F — Playbook (plexon-v3)

| ID | Task | Done when |
|----|------|-----------|
| F1 | Spec | `assistant-persona-website-audit-playbook.md` |
| F2 | Playbook registry entry `persona_website_audit` | sequential steps |
| F3 | Steps: persona resolve → pages → top-3 issue summary → optional GEO suggest | UI report |
| F4 | Intent router patterns | tests |
| F5 | Follow-up chips after Wave 1 handler | metadata.followUpPrompts |

### W2-G — Assistant polish (plexon-v3)

| ID | Task | Done when |
|----|------|-----------|
| G1 | Planner `persona_page_relevance` in free-chat when MCP-only path | `assistant-planner.ts` |
| G2 | `checkion_v3_*` tool family maps to `checkion_scan_read` | tool-catalog |
| G3 | audion-v3 MCP server skeleton + persona list/get | federation doc |
| G4 | Error UX: list persona names as chips when ambiguous | handler |

### W2-H — Journey findability (optional)

| ID | Task | Done when |
|----|------|-----------|
| H1 | Spec section in wave2 umbrella | acceptance |
| H2 | For top ranked URL: offer UX Journey quick run (Audion) | assistant CTA |
| H3 | Surface `pageIndex` / findability in CHECKION light payload if available | contract extension |

### W2-I — CREATION / BRANDION (demo)

| ID | Task | Done when |
|----|------|-----------|
| I1 | After ranking: link „Insight-Seite in CREATION öffnen“ with scene + URL query | demo doc |
| I2 | BRANDION: Brand Measure on top-1 URL (existing capability) | playbook step |
| I3 | Knowledge Pack stores last ranking snapshot facet `persona_page_ranking` | optional SSOT |

### W2-J — Models (optional, no default change)

| ID | Task | Done when |
|----|------|-----------|
| J1 | Draft policy doc only | no prod flip without explicit approval |
| J2 | Sonnet rationales behind env flag | C2 |

---

## Acceptance (Wave 2 complete)

- **WENN** Vaillant Collection frisch gebootet ist, **MUSS** ein completed B2C Deep Scan existieren (D2).
- **WENN** Assistant nach Sandra fragt, **MUSS** mindestens eine Seite Tags oder site-topics-Overlap zeigen (A6 + B2).
- **MUSS** Flow UC1 auf dem Board `persona_page_relevance` als Schritt ausführbar sein (E3).
- **MUSS** Playbook „Website-Audit für Persona X“ in einem Durchlauf Persona + Top-Seiten + Issues liefern (F3).

---

## Out of scope (Wave 3+)

- Full journey-agent on every corpus page
- Automatic CREATION page generation from ranking
- Shared Postgres / v2 CHECKION paths
- Claude-first global rollout (separate program)
