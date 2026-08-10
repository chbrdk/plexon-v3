# EQC results scrollytelling

Stand: 2026-08-10  
Spec: `specs/domain/ui-migrate-event-quick-check.md` (Wave 8)

## Intent

Done Event Quick Check results read as **magazine chapters**: each top-level band fills at least one viewport; scrolling snaps between chapters (`scroll-snap-type: y proximity` on `.plexon-eqc-results-scroll`).

## CSS contract

| Selector | Role |
|----------|------|
| `.plexon-eqc-results-scroll` | Snap container |
| `.plexon-eqc-results > .plexon-eqc-masthead-shell` | Cover chapter ≥ `100svh` |
| `.plexon-eqc-results > .plexon-dash-band` | Content chapters ≥ `100svh` |

`prefers-reduced-motion: reduce` disables snap + smooth scroll.

## Non-goals

- Horizontal storyboards
- JS-driven scroll hijacking
- Forcing short sections taller than their content beyond `min-height` (overflow still scrolls inside the page)
