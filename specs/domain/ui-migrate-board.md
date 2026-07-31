# UI migrate — Board + legacy DS removal

**Status:** Draft — Wave 7  
**Route:** `/board*`  
**Implements:** `app/board/**` · `components/board/**` · bridge/shim deletion

## Current state

- Board/Prismion still comes from `msqdx-design-system` via `@msqdx/react` bridge.
- That legacy package is MUI-based internally — do **not** reintroduce real MUI into plexon-v3.

## Strategy

1. Migrate board **chrome** (headers, empty states, dialogs around the canvas) to `@msqdx/ui`.
2. Isolate Prismion canvas behind a narrow adapter (`components/board/*`) until a non-MUI board exists in `msqdx-ui` or a dedicated package.
3. When canvas no longer needs the bridge:
   - delete `lib/msqdx-react-bridge/`
   - delete `lib/mui-shim.tsx` + `lib/mui-subpath-shims.ts`
   - remove webpack/tsconfig aliases for `@mui/material` and `@msqdx/react`
   - stop cloning/linking `msqdx-design-system` in Docker if unused
4. `app/design-system/page.tsx` stays a pointer to `msqdx-ui` (already).

## Acceptance

1. Board chrome has no direct `@mui/material` imports in app code.
2. Either Prismion adapter is documented as the only remaining legacy island, **or** board is fully on a non-MUI package.
3. Bridges removed when adapter no longer needed.
4. `npm run build` green without `@mui/material` alias (or alias only inside adapter package, not app).
5. Progress table Wave 7 → done.
