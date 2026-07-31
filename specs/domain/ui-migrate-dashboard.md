# UI migrate — Dashboard

**Status:** Accepted — Wave 1 done — 2026-07-31  
**Route:** `/`  
**Implements:** `app/page.tsx` (+ any dashboard-only children extracted during cutover)  
**Pattern:** magazine page like Products — `SectionChrome` + `Text` + `Panel` + `Button`/`Chip`/`StatLede`

## Current state

- Outer wrapper uses `plexon-magazine`.
- Body still imports `@msqdx/react` and `@mui/material` (~2000 lines).
- APIs and data fetching must stay live.

## Target composition

| Band | Treatment |
|------|-----------|
| Hero / lede | `SectionChrome` + `Text` title/lede (no MUI Typography) |
| Stats / metrics | `StatLede` / `MetricChip` / `Chip` |
| Project / product lists | `Panel` + `RankedList` or semantic lists — **no** MUI Card/Stack as layout |
| Actions | `Button` from `@msqdx/ui` |
| Empty / loading | `EmptyState` / `Spinner` / `LoadingText` |

## Non-goals

- Redesign product strategy or change federation payloads.
- Extracting every helper into new files unless needed for readability.

## File set (must lose legacy imports)

- `app/page.tsx`
- Any new `components/dashboard/*` created during this wave

## Acceptance

1. Zero `@mui/material` / `@msqdx/react` imports in the file set.
2. Dashboard remains full-width magazine inside AppShell.
3. Existing dashboard API calls and navigation targets unchanged (`shell-paths` / constants).
4. Smoke test: page renders shell + at least one section chrome heading.
5. Progress table Wave 1 → done.
