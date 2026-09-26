# Plexon Jev P0 Act — residual risk (2026-09-26)

## Shadow evidence

| Source | Finding |
|--------|---------|
| Plexon container logs (`n6f9…`) | **0** `[jev-shadow]` lines in last ~20k log lines |
| Echon API logs | **0** recent `[jev-shadow]` in sampled tail (radar persist still live: 779/6764 signals) |
| Coolify env (plexon) | `JEV_SHADOW_ENABLED=1`, model pin `typesafe/jev-1.13` — per-case Act flags were **absent** before this flip |

Shadow metrics are **thin**. Flip proceeds per program decision; document residual risk below.

## What Act flags do today

`lib/jev/shadow.ts` runs Jev when **shadow or Act** is on, logs `[jev-shadow]`, and **does not replace the heuristic baseline**.  
`routeAssistantIntent` / `planAssistantTurn` only call `scheduleJevShadow` (fire-and-forget).

Therefore enabling:

- `JEV_ACT_ASSISTANT_INTENT=1`
- `JEV_ACT_ASSISTANT_PLANNER=1`

**forces/keeps Jev API calls** for those use cases even if per-case shadow were off, but **heuristic remains SoT** until an Act-apply path awaits Jev and overrides.

## Residual risks

1. **No SoT flip yet** — user-visible intent/planner routing unchanged; Act is call+log until apply is wired.
2. **Thin agreement stats** — cannot claim ≥90% intent agreement from live logs.
3. **Latency/cost** — each assistant turn may add OpenRouter Decisions calls (timeout `JEV_TIMEOUT_MS=800`); fail-open.
4. **Planner choice set is coarse** — `questionsPlanner` buckets are a short list; Act-apply must map carefully when implemented.

## Rollback

Set `JEV_ACT_ASSISTANT_INTENT=0` and `JEV_ACT_ASSISTANT_PLANNER=0`, redeploy plexon (or restart). Heuristic path unchanged either way today.
