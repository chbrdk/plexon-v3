# EQC results scrollytelling

Stand: 2026-08-10  
Spec: `specs/domain/ui-migrate-event-quick-check.md` (Wave 8)

## Intent

Done Event Quick Check results read as **magazine chapters**: each top-level band fills at least one viewport; scrolling snaps between chapters (`scroll-snap-type: y proximity` on `.plexon-eqc-results-scroll`).

## CSS contract

| Selector | Role |
|----------|------|
| `.app-frame:has(.plexon-eqc-stage)` → `.app-main` → `.page-body` → `.plexon-stage` → `.plexon-eqc-stage` | Height chain (`100dvh`, `overflow: hidden`) so the inner scrollport can move |
| `.plexon-eqc-results` | Flex column; `gap: 50vh` between chapters |
| `.plexon-eqc-results-scroll` | Snap + scroll container (`overflow-y: auto`) |
| `.plexon-eqc-results > .plexon-eqc-masthead-shell` | Cover chapter ≥ one scrollport / `100svh` |
| `.plexon-eqc-results > .plexon-dash-band` | Content chapters ≥ one scrollport / `100svh` |

`prefers-reduced-motion: reduce` disables snap + smooth scroll.

**Bug note (2026-08-10):** Without the height chain, `.plexon-eqc-stage { overflow: hidden }` clipped content and the scroll child never became a bounded scrollport — wheel did nothing.

## Non-goals

- Horizontal storyboards
- JS-driven scroll hijacking
- Forcing short sections taller than their content beyond `min-height` (overflow still scrolls inside the page)
