# Msqdx / MUI shim inventory (App-Finalisierung)

**Date:** 2026-09-26  
**Status:** Bridge + MUI shim **purged**. Tokens shim remains. **`ignoreBuildErrors: false`**.

## Remaining alias

| Alias | Target | Notes |
|-------|--------|-------|
| `@msqdx/tokens` | `lib/msqdx-tokens-shim.ts` | Still used by board / assistant token reads |

## Removed (2026-09-26)

| Alias | Former target |
|-------|---------------|
| `@msqdx/react` | `lib/msqdx-react-bridge/` |
| `@mui/material` (+ Popper/Toolbar/Snackbar/Slider) | `lib/mui-shim.tsx` · `lib/mui-subpath-shims.ts` |

Aliases dropped from `next.config.mjs`, `vitest.config.ts`, `tsconfig.json`. Bridge/shim source deleted.

## App SoT

- UI: `@msqdx/ui` (+ `@msqdx/ui-shell`, `@msqdx/ui-tokens`)
- Board: `lib/board/prismion.ts` · `lib/board/board-ui.tsx` · `components/ui/layout` (`Box`)

## Typecheck

- `tsc --noEmit` clean for app/lib/components (2026-09-26).
- `tsconfig.json` excludes `__tests__` / `*.test.ts(x)` — Vitest owns test transpile; do not re-enable without fixing leftover test fixture casts.
- `next.config.mjs` → `typescript.ignoreBuildErrors: false`.
