# Msqdx / MUI shim inventory (App-Finalisierung)

**Date:** 2026-09-26  
**Context:** Shrink bridge surface; only flip `typescript.ignoreBuildErrors` when the remaining set is small and typed cleanly.

## Build gate

`next.config.mjs` still has `typescript.ignoreBuildErrors: true` because production imports still resolve through:

- `@msqdx/react` → `lib/msqdx-react-bridge/`
- `@mui/material` → `lib/mui-shim.tsx` (+ subpath shims)
- `@msqdx/tokens` → `lib/msqdx-tokens-shim.ts`

## Remaining islands (intentional)

| Area | Why still shimmed |
|------|-------------------|
| `components/board/ReactFlowBoard.tsx` | Prismion / ReactFlow canvas island |
| `lib/board-*.ts` | Prismion/Connection types + `wouldOverlap` from bridge |

## Cleared (2026-09-26 Prio-1 slice)

- `components/auth/RequireAdminRole.tsx` → `@msqdx/ui` Spinner + CSS
- `lib/assistant/ui-visual.ts` — local `alpha`, `BrandColor` from `lib/assistant/brand-color.ts`
- `lib/assistant/ui-typography.ts` — same local `BrandColor`

## Cleared earlier (Parity / Wave 7)

- EQC, reports, dashboard admin edit, `components/assistant-ui/**`, orphan layout chrome (Welle 2a)

## Next cut order

1. Extract Prismion types to plexon-owned module **or** rewrite ReactFlowBoard off legacy DS
2. Drop bridge + mui-shim aliases when board island is gone
3. Re-run `tsc --noEmit`; if clean, set `ignoreBuildErrors: false`
