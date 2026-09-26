# Plexon Jev P0 Act — residual risk (2026-09-26)

## Shadow evidence

| Source | Finding |
|--------|---------|
| Plexon container logs (`n6f9…`) | **0** `[jev-shadow]` lines in last ~20k log lines (pre-flip sample) |
| Echon API logs | **0** recent `[jev-shadow]` in sampled tail (radar persist still live: 779/6764 signals) |
| Coolify env (plexon) | `JEV_SHADOW_ENABLED=1`, model pin `typesafe/jev-1.13`, `JEV_ACT_ASSISTANT_INTENT=1`, `JEV_ACT_ASSISTANT_PLANNER=1` |

Shadow metrics remain **thin**. Flip proceeded per program decision; residual risk below.

## Act-apply status (wired)

Act-apply **is wired** (spec `specs/domain/jev-decisions.md` § Act-apply):

| Use case | Path | Behavior |
|----------|------|----------|
| `assistant.intent` | `resolveAssistantIntent` via `resolveJevActOrShadow` + `applyAssistantIntentAct` | Awaits Jev; on success overrides heuristic Choice; fail-open keeps baseline; logs `[jev-act]` |
| `assistant.planner` | `planAssistantTurn` → `applyPlannerJevAct` | Awaits Jev; rematerializes coarse buckets (`general_chat` / `creation_scene_edit` / `geo_analysis`) + `allow_write` Noul; fail-open; logs `[jev-act]` |

Sync `routeAssistantIntent` stays heuristic + fire-and-forget shadow for unit tests. Request path (`complete-handler`) uses `resolveAssistantIntent`.

Shadow-only (`JEV_SHADOW_*` without Act) remains fire-and-forget and does **not** change SoT.

## Residual risks

1. **Thin agreement stats** — cannot claim ≥90% intent agreement from live logs yet; watch `[jev-act]` / `[jev-shadow]` after deploy.
2. **Latency/cost** — each Act-on assistant turn may add OpenRouter Decisions calls (timeout `JEV_TIMEOUT_MS=800`); fail-open on error/timeout.
3. **Planner choice set is coarse** — only a short bucket list rematerializes; unmapped/`other` keeps heuristic intent (may still flip `allow_write`).
4. **Param extraction** — intent Act only applies when `materializeAssistantIntent` can build params (e.g. URL for geo/scan); otherwise baseline stays.

## Rollback

Set `JEV_ACT_ASSISTANT_INTENT=0` and `JEV_ACT_ASSISTANT_PLANNER=0`, redeploy plexon (or restart). Heuristic resumes immediately.
