# Assistant ↔ CREATION — Domain Autonomy Wave (“AGI-lite”)

**Status:** Accepted plan — 2026-09-13  
**Owner:** PLEXON v3 (orchestrator) · companions CREATION MCP / Brandion tokens  
**Depends:** `specs/domain/assistant-creation-mcp.md` (quality loop shipped) · `specs/domain/collection-memory-wave1.md` · `creation-v3/specs/domain/craft-debug.md` · `creation-v3/specs/domain/page-as-pattern.md` · `creation-v3/knowledge/scene-agent-site-kit-recipe.md`  
**Knowledge:** `knowledge/assistant-creation-agi-lite.md` · `knowledge/creation-mcp-assistant.md` · `knowledge/paths.md`

## Purpose

Raise Creation scene turns from “thorough tool loop” to **repeatable domain autonomy**: the agent finishes landings and page→pattern saves with measurable quality, Collection-scoped memory, and playbook procedure — **without** claiming general intelligence, Managed Agents swarms, or a second scene writer.

Literal AGI is a **non-goal**. This wave is the product path that *feels* smart: verify → remember → reuse procedure → score.

## Baseline (already shipped — 2026-09-13)

| Lever | Where |
|-------|--------|
| Prefetch outline + palette + craft-debug (+ optional Spirion list) | `creation-scene-prefetch` |
| Parallel MCP reads; serial writes | `mcp-tool-parallel` |
| In-process quality gate (audit + craft-debug + preview; `craft-thin` must-fix) | `creation-scene-quality` |
| Depth budget (14 rounds / thinking floor) | `creation-scene-depth` |
| MCP: `creation.scene_craft_debug`, `creation.site_kit_page_save` | creation-v3 `mcp-server` |

## Architecture principles (locked)

1. **One scene writer** — Coordinator only. No parallel layout subagents (optimistic lock / 409).
2. **Critic ≠ writer** — Deterministic gate + optional Vision critique; critic never calls `apply_ops`.
3. **Scope-before-memory** — Collection (`platformProjectId`) eligibility first; then retrieve craft prefs / skills (aligns with modern agent-memory practice: shard by scope, don’t dump global RAG into every turn).
4. **Procedure over improvisation** — Prefer versioned playbooks for known jobs; free-chat remains for exploration.
5. **Eval before prompt thrash** — Change gates/prompts only when the harness score moves.

## Keep / reshape / drop

| Item | Decision | Note |
|------|----------|------|
| In-process quality gate | **Keep** | Extend findings; do not replace with a second LLM writer |
| Prefetch + parallel reads | **Keep** | |
| HTML-first greenfield import | **Keep** | Still preferred over dozens of `insert_child` |
| Free `set_prop` literals | **Keep** | Brand tokens optional, not blocking |
| Anthropic Managed Agents / multi-writer swarm | **Drop** | Lock conflicts; quality ≠ agent count |
| Monolithic “remember everything” vector memory | **Drop** | Use Collection Knowledge Pack sections + small craft shard |
| New app-local UI primitives for agent chrome | **Drop** | Stay on `@msqdx/ui` if UI surfaces appear |
| Website-audit / launch-readiness playbook runner shape | **Reshape** | Reuse registry patterns for Creation craft playbooks; different step kinds |
| Collection Memory Wave 1 distillates | **Keep + extend** | Add Creation craft section ids; never store raw chat |

## Wave A — Visual must-fix critic (quality depth)

**Status A1:** Implemented 2026-09-13 (`lib/assistant/creation-scene-quality.ts`)  
**Goal:** Gate fails on structural emptiness even when `craft-thin` is absent / preview soft-skipped.

### Must-fix signals (deterministic first)

Derive from last `creation_scene_craft_debug` / `content_audit` / tree outline (no new MCP required for A1):

| Signal | Fail when |
|--------|-----------|
| `craft-thin` | Already shipped |
| Audit errors | Already shipped |
| Missing hero mass | craft stats / flags say no dominant hero / viewport band too small |
| Seed / fixture chrome | audit or content strings match known seed (“Get started”, “Option A”, fixture orange / Noto-only) |
| CTA absence | landing/PDP intent and no primary button/link node in outline |

### Soft signals (Vision — A2)

After `creation_scene_preview` succeeds, existing Vision pass **must** reject gray wireframe / tiny placeholders (already in creation MCP spec). Wave A2 adds **structured Vision checklist** returned into the quality nudge (pass/fail bullets), still without a second writer.

### Acceptance A

1. Unit: `evaluateCreationSceneQuality` fails on fixture seed chrome / missing CTA when intent tagged `landing`.
2. Unit: preview tool `error` remains soft-skip; missing preview call still blocks.
3. Staging smoke: 3 landings; none finish with only seed copy.

## Wave B — Creation craft playbooks

**Goal:** Known jobs run as procedures, not free improvisation.

| Playbook id | Job | Happy path |
|-------------|-----|------------|
| `creation_landing_v1` | Greenfield / restyle landing | HTML import → audit+craft+preview → polish ops → optional page_save |
| `creation_page_as_pattern_v1` | Persist artboard as Pattern | `site_kit_page_save` → verify bind → craft-debug clean |

### Behaviour

- Planner MAY select a craft playbook when intent is `creation_scene_edit` **and** user phrasing matches (Landing bauen, Seite als Pattern, …) **or** editor context + explicit confirm.
- Playbook injects a **phased system block** (ordered must-do tool sequence). It does **not** bypass the quality gate.
- Implementation may start as prompt+gate recipes (`lib/assistant/creation-craft-playbooks.ts`) before full `run_playbook` step runner parity.

### Acceptance B

1. Unit: landing phrasing → playbook id `creation_landing_v1`.
2. Unit: “Seite als Pattern” → `creation_page_as_pattern_v1`.
3. Gate still blocks finish if craft-thin after playbook steps.

## Wave C — Collection craft memory (scoped)

**Goal:** Next turn on the same Collection starts warmer — without chat dumps.

### Store

Reuse Collection Knowledge Pack `research_brief.sections[]` (Wave 1 transport).

| Section id | Contents (plainText + bullets) | Write when |
|------------|--------------------------------|------------|
| `creation-craft-prefs-latest` | Tone, preferred type scale, color literals used, Kit masters reused, “avoid” list | Successful scene turn that passed quality gate **and** Collection bound |
| `creation-landing-recipe-latest` | Short recipe: HTML-first? masters? breakpoints? | Landing playbook success |

### Read

On `creation_scene_edit` with `platformProjectId`, hydrate these sections into the system prompt (compact, budget-capped) **after** entitlement/scope checks.

### Non-goals C

- Raw transcripts in the pack  
- Cross-Collection “global taste” without ACL  
- Parametric fine-tuning / weight updates  

### Acceptance C

1. Unit: distill builder emits stable section ids; merge replaces previous.
2. Unit: unbound scene → no craft-prefs publish.
3. Staging: second landing on same Collection references prior prefs in tool choices (manual rubric).

## Wave D — Eval harness + model routing

**Goal:** Stop guessing; score autonomy.

### Harness (`creation-craft-eval`)

| Piece | Requirement |
|-------|-------------|
| Fixture set | ≥ 20 briefs (DE/EN): landing, PDP, restyle, page-as-pattern, brand-bound, unbound-fail |
| Runner | Headless turn against staging MCP **or** recorded tool fixtures in CI |
| Scores | `finished` · `gate_pass` · `thin` · `seed_chrome` · `preview_ok` · `rounds_used` · `latency_ms` |
| CI | Unit/fixture mode on every PR that touches assistant Creation paths; live staging smoke optional nightly |

### Budget-tier routing (lightweight)

| Tier | When | Model / thinking |
|------|------|------------------|
| Low | Pure reads / catalog Q&A | Default assistant model, base thinking |
| Mid | `creation_scene_edit` polish | Current Creation depth defaults |
| High | Playbook landing + Vision critique | Max thinking floor; optional stronger model id via env |

Router is **heuristic + intent**, not RL. Env keys only via constants / runtime-config; document in `knowledge/paths.md` + `coolify-env-variablen.md`.

### Acceptance D

1. Fixture harness runs in CI with ≥ 5 recorded traces and deterministic scores.
2. Doc lists how to run live staging eval (paths/FQDNs from knowledge only).
3. High-tier env documented; default Mid does not regress Q&A cost.

## Sequencing

```
A1 deterministic visual must-fix
  → B playbooks (landing + page-as-pattern)
  → A2 structured Vision checklist
  → C craft memory sections
  → D eval harness + routing
```

Do not start C/D until A1 has unit coverage. B may land in parallel with A1 if playbooks only add prompt recipes.

## Env (forward)

| Key | Wave | Notes |
|-----|------|-------|
| (existing) `ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS` | — | Keep |
| (existing) `ANTHROPIC_CREATION_SCENE_THINKING_BUDGET` | — | Keep |
| `ASSISTANT_CREATION_CRAFT_MEMORY` | C | default on when Collection bound; `0` disables publish/hydrate |
| `ASSISTANT_CREATION_MODEL_TIER` | D | `low` \| `mid` \| `high` override; default auto |
| `ASSISTANT_CREATION_EVAL_MODE` | D | `off` \| `fixture` \| `live` |

Canonical FQDNs / Coolify UUIDs: `knowledge/paths.md` · `knowledge/coolify-deploy-api.md` — never hardcode in app logic.

## Non-goals (wave-wide)

- Literal AGI / open-ended world models  
- Parallel scene writers / Managed Agents fan-out  
- CEM / Host live ops  
- Replacing Brandion as token SSOT  
- Storing secrets or full HTML dumps in Knowledge Pack  

## Rollout / deploy

1. Spec + unit tests first (this doc).  
2. Implement A1 → deploy plexon-v3 only.  
3. B may need no Creation deploy if tools already exist; C may need pack distill helpers only on plexon.  
4. After each plexon deploy: `GET /api/health` → `deployment.commitSha` matches `main` (`knowledge/coolify-deploy-api.md`).

## Acceptance (wave complete)

Wave is **done** when:

1. A–D acceptance bullets above are green.  
2. Eval fixture median: `gate_pass ≥ 0.8` and `thin ≤ 0.15` on the landing subset.  
3. Knowledge + `specs-index.md` link this spec; creation MCP knowledge notes the autonomy wave.
