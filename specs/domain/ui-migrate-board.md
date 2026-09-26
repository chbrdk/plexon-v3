# UI migrate — Board + legacy DS removal

**Status:** Accepted — App-Finalisierung Prio 1 cutover slice — 2026-09-26  
**Route:** `/board*`  
**Implements:** `app/board/**` · `components/board/**` · `lib/board/**`

**Not this:** Collection Test Flow — see `specs/domain/collection-test-flow.md`.

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Board page chrome (stage, add-prompt) | **reshape** ✅ | `@msqdx/ui` Button + `.plexon-board-*` |
| Prismion / ReactFlow canvas | **reshape** ✅ (2026-09-26) | Types + chrome via `lib/board/prismion` + `lib/board/board-ui`; `Box` from `@/components/ui/layout` |
| Bridge + mui-shim deletion | **drop** ✅ (2026-09-26) | Files + webpack/tsconfig/vitest aliases deleted; `@msqdx/tokens` shim kept |

## File set

- `app/board/page.tsx` — no `@mui` / `@msqdx/react`
- `app/board/layout.tsx` — `RequireAdminRole` on `@msqdx/ui`
- `components/board/ReactFlowBoard.tsx` — local board modules only
- `lib/board/prismion.ts` — types + `wouldOverlap`
- `lib/board/board-ui.tsx` — Input / IconButton / Toolbar / Popover / Markdown

## Acceptance

1. Board page chrome has no direct `@mui/material` imports. ✅
2. Board canvas has no `@msqdx/react` / `@mui/material` imports. ✅
3. Full bridge/shim package deletion. ✅ (`lib/msqdx-react-bridge/` · `lib/mui-shim.tsx` · aliases)
4. Progress: **chrome + island cutover + purge done** (ReactFlow remains; tokens shim only).
