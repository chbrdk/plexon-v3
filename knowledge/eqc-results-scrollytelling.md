# EQC results scrollytelling

Stand: 2026-08-10  
Spec: `specs/domain/ui-migrate-event-quick-check.md` (Wave 8)  
Constants: `lib/assistant/event-quick-check/eqc-results-chapter-heights.ts`

## Intent

Done Event Quick Check results read as **magazine chapters**: cover is shorter; content bands fill at least one viewport; scrolling snaps between chapters (`scroll-snap-type: y proximity` on `.plexon-eqc-results-scroll`).

## Heights & gaps

| Token | Value | Role |
|-------|-------|------|
| Cover chapter | `70svh` | First section (`.plexon-eqc-masthead-shell`) |
| Tall chapter | ≥ `100svh` | `.plexon-dash-band` min-height |
| Gap tall↔tall | `50vh` | Both neighbors measured ≥ 100vh |
| Gap if either short | `20vh` | Cover or any chapter measured &lt; 100vh |

`data-eqc-chapter="tall"|"short"` is synced by `syncEqcResultsChapterHeights` (ResizeObserver on the results root). CSS:

- `.plexon-eqc-results > * + *` → tall gap
- `.plexon-eqc-results > [data-eqc-chapter='short'] + *` / `* + [data-eqc-chapter='short']` → short gap

## CSS contract

| Selector | Role |
|----------|------|
| `.app-frame:has(.plexon-eqc-stage)` → … → `.plexon-eqc-stage` | Height chain (`100dvh`, `overflow: hidden`) |
| `.plexon-eqc-results-scroll` | Snap + scroll container |
| `.plexon-eqc-results > .plexon-eqc-masthead-shell` | Cover ≥ `70svh` |
| `.plexon-eqc-results > .plexon-dash-band` | Content ≥ `100svh` |

`prefers-reduced-motion: reduce` disables snap + smooth scroll.

**Bug note (2026-08-10):** Without the height chain, `.plexon-eqc-stage { overflow: hidden }` clipped content and the scroll child never became a bounded scrollport — wheel did nothing.

## Non-goals

- Horizontal storyboards
- JS-driven scroll hijacking
- Forcing the cover taller than `70svh`
