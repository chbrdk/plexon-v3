# Creation craft eval + model tiers (Wave D)

**Spec:** `specs/domain/assistant-creation-agi-lite.md` § Wave D  
**Code:** `lib/assistant/creation-craft-eval.ts` · `lib/assistant/creation-model-tier.ts`  
**Tests:** `__tests__/creation-craft-eval.test.ts`

## Fixture mode (CI)

Deterministic — no live MCP / Anthropic calls.

```bash
npx vitest run __tests__/creation-craft-eval.test.ts
```

Harness pieces:

| Piece | Source |
|-------|--------|
| ≥20 briefs DE/EN | `CREATION_CRAFT_EVAL_BRIEFS` |
| ≥5 recorded tool traces | `CREATION_CRAFT_EVAL_TRACES` |
| Scores | `finished` · `gate_pass` · `thin` · `seed_chrome` · `preview_ok` · `rounds_used` · `latency_ms` via `evaluateCreationSceneQuality` |
| Floors | Landing subset: `gate_pass ≥ 0.8`, `thin ≤ 0.15` |

Env `ASSISTANT_CREATION_EVAL_MODE=fixture` is reserved for future runners; unit tests call `runCreationCraftEvalFixture()` directly.

## Live staging eval (optional / nightly)

Paths and FQDNs only from knowledge — never hardcode in app logic.

1. Confirm Creation MCP + plexon-v3 health (`knowledge/coolify-deploy-api.md` · `knowledge/paths.md`).
2. Bound Collection with Creation capability; open a scene in Creation.
3. Run a small brief set from `CREATION_CRAFT_EVAL_BRIEFS` (landing + newsletter + page-as-pattern) via Assistant FAB.
4. Score manually against the same gate signals: audit clean, craft-debug without `craft-thin`, preview ok (or soft-skip), no seed chrome.
5. Optional: set `ASSISTANT_CREATION_EVAL_MODE=live` when a headless live runner lands; until then treat this as operator smoke.

Staging FQDNs: plexon-v3 + creation-mcp rows in `knowledge/coolify-deploy-api.md`.

## Budget tiers

| Tier | When (auto) | Thinking | Model |
|------|-------------|----------|-------|
| low | Non-`creation_scene_edit` or read-only | Base assistant budget | Default |
| mid | Scene polish without high playbook | Creation scene depth budget | Default |
| high | Write + landing/newsletter/print playbook | Floor ≥12288 (unless HIGH thinking off) | Default **unless** `ASSISTANT_CREATION_HIGH_MODEL` / `ANTHROPIC_ASSISTANT_MODEL_HIGH` |

Override: `ASSISTANT_CREATION_MODEL_TIER=low|mid|high`. Coolify notes: `knowledge/coolify-env-variablen.md`.

Q&A cost lock: without a high model env, high tier only raises thinking — completion model stays mid/default.
