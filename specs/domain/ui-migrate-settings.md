# UI migrate — Settings

**Status:** Draft — Wave 2  
**Route:** `/settings`  
**Implements:** `app/settings/page.tsx` · `components/settings/*`  
**DS:** `Field`, `Input`, `Select`, `Switch`, `ToggleGroup`, `Text`, `Panel`, `Button`, `Avatar`

## Current state

- Settings still on `@msqdx/react` / MUI via bridge.
- Brand color and account prefs must keep working.

## Target composition

| Band | Treatment |
|------|-----------|
| Profile | `Avatar` + `Field`/`Input` |
| Appearance / theme | `ToggleGroup` or `Switch` → existing theme persistence |
| Brand color | rebuild `BrandColorSelector` on `@msqdx/ui` (no MUI) — mirror auth selector pattern |
| Account / security | `Panel` + `Button` / links via `shell-paths` |

## File set

- `app/settings/page.tsx`
- `components/settings/**`

## Acceptance

1. No legacy DS imports in file set.
2. Prefs / brand color persist as today.
3. Rail footer → settings still active.
4. Smoke test covers settings heading + one field interaction if cheap.
5. Progress table Wave 2 → done.
