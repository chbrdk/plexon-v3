# Jev decisions (System One) — PLEXON

**Status:** Accepted — shadow-first  
**Model:** OpenRouter `typesafe/jev-1.13` (pin; never `jev-latest` in production)  
**API:** `POST {OPENROUTER_API_BASE_URL}/api/alpha/decisions`

## Purpose

Jev returns typed decisions (Choice / Score / Noul) with calibrated probabilities. It does **not** generate prose. PLEXON uses Jev for fuzzy routing and classification; Anthropic/OpenAI remain for free-chat and narratives.

## Shadow contract

1. Existing heuristic or LLM remains **source of truth** until `JEV_ACT_<USE_CASE>=1`.
2. When `JEV_SHADOW_ENABLED=1` (and optional per-case `JEV_SHADOW_<USE_CASE>` not `0`), call Jev in parallel (fail-open, ~800 ms timeout).
3. Log structured compare: `useCaseId`, `baseline`, `jev`, `agree`, `latencyMs`, `costUsd`, `model`.
4. Never surface Jev text to users (there is none). Never block the request on shadow failure.

## Act flip

Enable `JEV_ACT_<USE_CASE>` only after shadow window meets criteria in `knowledge/jev-flip-runbook.md` (agreement, p95 latency, cost/1k, tests green).

## Exclusion — do not call Jev

Deterministic gates stay code-only:

- Product MCP entitlement/URL gates (`resolveUse*Mcp`)
- Collection Flow numeric score/issue/GEO compares
- Attachment quotas, pin eligibility status checks
- Pure env boolean toggles

## Env keys

| Key | Role |
|-----|------|
| `OPENROUTER_API_KEY` | Required for shadow/act |
| `OPENROUTER_API_BASE_URL` | Default `https://openrouter.ai` |
| `JEV_MODEL_ID` | Default `typesafe/jev-1.13` |
| `JEV_SHADOW_ENABLED` | Global shadow (`1`/`true`) |
| `JEV_SHADOW_<USE_CASE>` | Per-case override (`0` off, `1` on) |
| `JEV_ACT_<USE_CASE>` | Per-case act (default off) |
| `JEV_TIMEOUT_MS` | Default `800` |

Use-case IDs: `specs/domain/jev-use-case-catalog.md`.  
Implementation: `lib/jev/`.
