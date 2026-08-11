# EQC results scrollytelling

Stand: 2026-08-11  
Spec: `specs/domain/ui-migrate-event-quick-check.md` (Wave 8)  
Constants: `lib/assistant/event-quick-check/eqc-results-chapter-heights.ts`  
Mode hook: `components/event-quick-check/useEqcPresentationMode.ts`

## Intent

Done Event Quick Check results support two modes:

| Mode | Default | Behavior |
|------|---------|----------|
| **compact** | yes | Tight section gaps, natural chapter height, no snap |
| **present** | toggle | Magazine chapters: cover shorter; bands ≥1 viewport; snap + keyboard deck nav; chrome-less shell |

## Heights & gaps (present only)

| Token | Value | Role |
|-------|-------|------|
| Cover chapter | `70svh` | First section (`.plexon-eqc-masthead-shell`) |
| Tall chapter | ≥ `100svh` | `.plexon-dash-band` min-height |
| Gap tall↔tall | `50vh` | Both neighbors measured ≥ 100vh |
| Gap if either short | `20vh` | Cover or any chapter measured &lt; 100vh |

`data-eqc-chapter="tall"|"short"` is synced by `syncEqcResultsChapterHeights` while presenting. CSS is scoped under `[data-eqc-mode='present']`.

Compact uses `--eqc-compact-gap` between sections.

## Interaction (present)

- Masthead toggle: Präsentieren / Präsentation beenden
- Keyboard: ↓/PgDn/Space next · ↑/PgUp prev · Home/End · Esc exit
- HUD dots for chapter jump
- `data-eqc-presenting` hides AppShell rail/topbar/brand/FAB via `:has()`

## CSS contract

| Selector | Role |
|----------|------|
| `.app-frame:has(.plexon-eqc-stage)` → … → `.plexon-eqc-stage` | Height chain (`100dvh`, `overflow: hidden`) |
| `.plexon-eqc-results-scroll[data-eqc-mode='present']` | Snap + smooth scroll |
| `.plexon-eqc-results[data-eqc-mode='present'] > .plexon-eqc-masthead-shell` | Cover ≥ `70svh` |
| `.plexon-eqc-results[data-eqc-mode='present'] > .plexon-dash-band` | Content ≥ `100svh` |
| `.plexon-eqc-results[data-eqc-mode='compact']` | Everyday spacing |

`prefers-reduced-motion: reduce` disables snap + enter motion in present.

## Non-goals

- Browser Fullscreen API
- URL `?present=1` / localStorage persistence (v1)
- Horizontal storyboards
