# Interactive journey outline (Plexon)

**Date:** 2026-08-11  
**Spec:** `specs/domain/assistant-journey-outline.md` · generate `specs/domain/assistant-journey-generate.md`

## Behaviour

- Builder embeds each phase’s moments on `phase_strip.phases[].moments`.
- `UiPhaseStrip` is interactive when any phase has moments: click/keyboard → active phase + Moments panel updates.
- Standalone `moment_list` remains for showcase / tool recipes without embedded moments.

## DS

Uses existing `ChatPhaseStrip.onPhaseActivate` — no new primitive required.
