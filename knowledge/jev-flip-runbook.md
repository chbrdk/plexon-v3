# Jev flip runbook

Shadow-first System One decisions (`typesafe/jev-1.13` via OpenRouter).  
Specs: PLEXON `specs/domain/jev-decisions.md` · catalog `jev-use-case-catalog.md` · ECHON `jev-light-classify.md` (ADR 0034).

## Defaults

| Flag | Default | Meaning |
|------|---------|---------|
| `JEV_SHADOW_ENABLED` | off | Parallel compare logs |
| `JEV_ACT_<USE_CASE>` | off | Use Jev as SoT for that case |
| `JEV_MODEL_ID` | `typesafe/jev-1.13` | Pin — never `jev-latest` in prod |

## Shadow window

1. Enable `OPENROUTER_API_KEY` + `JEV_SHADOW_ENABLED=1` on staging.
2. Collect ≥ N decisions per use case (intent ≥500, classify ≥200 fixtures+live).
3. Aggregate logs (`[jev-shadow]` JSON): agreement rate, p50/p95 latency, cost/1k, error rate.

## Flip criteria (per use case)

- Agreement ≥ target (intent ≥90%; light classify category ≥ baseline −3 pp)
- p95 latency ≤ 800 ms (or documented budget)
- Cost/1k within approved budget
- Unit/integration tests green with Act flag on
- Rollback: set `JEV_ACT_*=0` (heuristic resumes immediately)

## Echon

- Eval: `scripts/eval_light_classify.py` (+ optional `--shadow` when key present)
- Act: `ECHON_V3_CLASSIFY_PROVIDER=jev` **and** `JEV_ACT_ECHON_LIGHT_CLASSIFY=1`
- News radar Act stays meta until foresight/wave gates consume it (`JEV_ACT_ECHON_NEWS_RADAR`)

## Never flip

Deterministic entitlement gates, numeric Collection Flow compares, attachment quotas, client-side UI-only tone helpers without server path.
