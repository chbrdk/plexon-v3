# Jev routing Act pause — 2026-09-30

**Why:** Act misrouted “julia wendt duplizieren” → `persona_bootstrap` (“Neues Projekt”).

**Change:** `assistant.intent` and `assistant.planner` Act are **off by default**. Heuristics are SoT.

| Env | Role |
|-----|------|
| `JEV_ACT_ROUTING` | Master switch (must be `1` to allow routing Act) |
| `JEV_ACT_ASSISTANT_INTENT` | Per-case (ignored for SoT unless routing master on) |
| `JEV_ACT_ASSISTANT_PLANNER` | Per-case (same) |
| `JEV_SHADOW_*` | Unchanged — fire-and-forget only |

Code: `lib/jev/env.ts` · Spec: `specs/domain/jev-decisions.md` § Routing Act pause

Coolify plexon: set `JEV_ACT_ROUTING=0` (or omit), `JEV_ACT_ASSISTANT_INTENT=0`, `JEV_ACT_ASSISTANT_PLANNER=0`.
