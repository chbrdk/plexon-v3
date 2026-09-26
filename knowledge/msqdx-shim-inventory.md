# Msqdx / MUI shim inventory (App-Finalisierung)

**Date:** 2026-09-26  
**Context:** Board cutover slice — app code no longer imports `@msqdx/react` or `@mui/material`.

## Build gate

`next.config.mjs` may still alias:

- `@msqdx/react` → `lib/msqdx-react-bridge/`
- `@mui/material` → `lib/mui-shim.tsx`
- `@msqdx/tokens` → `lib/msqdx-tokens-shim.ts`

These are **legacy aliases** after the board cutover. Safe to remove in a follow-up once Vitest/webpack configs and dead bridge files are deleted.

## App import status (2026-09-26)

| Alias | App/components/lib imports |
|-------|----------------------------|
| `@msqdx/react` | **none** |
| `@mui/material` | **none** |

Board SoT: `lib/board/prismion.ts` · `lib/board/board-ui.tsx` · `components/ui/layout` (`Box`).

## Cleared this slice

- `ReactFlowBoard` + `lib/board-*.ts` + `app/board/page.tsx` off bridge/MUI
- Collision test no longer mocks `@msqdx/react`

## Next

1. Delete `lib/msqdx-react-bridge/` + unused `lib/mui-shim.tsx` (or keep shim only if something still resolves subpaths)
2. Drop webpack/tsconfig/vitest aliases
3. `tsc --noEmit`; set `ignoreBuildErrors: false` when clean
