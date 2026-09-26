# Msqdx / MUI shim inventory (App-Finalisierung)

**Date:** 2026-09-26  
**Status:** Bridge + MUI shim **purged**. Tokens alias = **ui-tokens-backed facade**. **`ignoreBuildErrors: false`**.

## Remaining alias

| Alias | Target | Notes |
|-------|--------|-------|
| `@msqdx/tokens` | `lib/msqdx-tokens-shim.ts` | Compatibility exports (`MSQDX_*`) built from `@msqdx/ui-tokens` — no `msqdx-design-system/packages/tokens` import |

## Removed (2026-09-26)

| Alias | Former target |
|-------|---------------|
| `@msqdx/react` | `lib/msqdx-react-bridge/` |
| `@mui/material` (+ Popper/Toolbar/Snackbar/Slider) | `lib/mui-shim.tsx` · `lib/mui-subpath-shims.ts` |
| Tokens → design-system package | `export * from '../../msqdx-design-system/packages/tokens/...'` |

Aliases for MUI/react dropped from `next.config.mjs`, `vitest.config.ts`, `tsconfig.json`. Bridge/shim source deleted.

## App SoT

- UI: `@msqdx/ui` (+ `@msqdx/ui-shell`, `@msqdx/ui-tokens`)
- Board: `lib/board/prismion.ts` · `lib/board/board-ui.tsx` · `components/ui/layout` (`Box`)
- Legacy token names: `@msqdx/tokens` facade only

## Typecheck

- `tsc --noEmit` clean for app/lib/components (2026-09-26).
- `tsconfig.json` excludes `__tests__` / `*.test.ts(x)` — Vitest owns test transpile.
- `next.config.mjs` → `typescript.ignoreBuildErrors: false`.
- Coolify: Dockerfile clones `audion-v3` contracts (+ msqdx-ui / design-system for board).
