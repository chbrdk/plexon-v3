# UI migrate — Event Quick Check

**Status:** Draft — Wave 6  
**Route:** `/event-quick-check*`  
**Implements:** `app/event-quick-check/**` · `components/event-quick-check/**`  
**Layout:** full-height workstation

## Current state

- Workflow UI still on bridge / MUI.
- Deep scan, geo, competitors, citations, review gate must keep API behavior.

## Target composition

| Band | Treatment |
|------|-----------|
| Workflow steps | `WizardSteps` or `Tabs` from `@msqdx/ui` |
| Panels | `Panel` + `SectionChrome` |
| Forms | `Field` / `Input` / `Textarea` / `Select` |
| Progress | `Spinner` / status text — not MUI LinearProgress |
| Charts | Recharts OK inside `@msqdx/ui` chrome |

## Acceptance

1. No legacy imports in EQC file set.
2. Existing workflow APIs and report deep-links unchanged.
3. Progress table Wave 6 → done.
