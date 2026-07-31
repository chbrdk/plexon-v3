# UI migrate — Assistant

**Status:** Draft — Wave 5  
**Route:** `/assistant*`  
**Implements:** `app/assistant/**` · `components/assistant/**` · `components/assistant-ui/**`  
**Layout:** full-height workstation (not magazine lede)

## Current state

- Large surface still on `@msqdx/react` / MUI via bridge (~40+ files).
- Generative UI blocks and chat chrome must keep behavior.

## Target composition

| Band | Treatment |
|------|-----------|
| Chat chrome | `@msqdx/ui` Text/Button/Input/Textarea/Chip; prefer DS chat primitives if present |
| Message list / composer | no MUI Stack/Box — CSS layout + shell tokens |
| Generative UI organisms | rebuild on `Panel` / `Text` / charts as today (Recharts OK) |
| Reports / pins | `Button` / `Chip` / `Dialog` from `@msqdx/ui` |

## Non-goals

- Changing orchestrator / federation / report contracts.
- Visual redesign beyond DS primitives.

## Acceptance

1. No legacy imports in assistant file set.
2. Chat send / history / report pin flows smoke-testable.
3. Progress table Wave 5 → done.
