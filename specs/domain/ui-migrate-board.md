# UI migrate — Board + legacy DS removal

**Status:** Accepted (chrome) — Wave 7 partial — 2026-07-31  
**Route:** `/board*`  
**Implements:** `app/board/**` · `components/board/**` · bridge/shim deletion (deferred)

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Board page chrome (stage, add-prompt) | **reshape** | `@msqdx/ui` Button + `.plexon-board-*` |
| Prismion / ReactFlow canvas | **keep as island** | `components/board/ReactFlowBoard.tsx` still needs bridge/`@msqdx/react` types + Popover until non-MUI Prismion exists |
| Bridge + mui-shim deletion | **defer** | Blocked by canvas island + remaining assistant generative-UI / ReportCollectionBar |

## File set (chrome done)

- `app/board/page.tsx` — no `@mui` / `@msqdx/react`
- `app/board/layout.tsx` — already clean (`RequireAdminRole`)

## Island (documented)

- `components/board/ReactFlowBoard.tsx` — **only** remaining board surface on bridge

## Acceptance

1. Board page chrome has no direct `@mui/material` imports. ✅
2. Prismion adapter documented as the only board legacy island. ✅
3. Full bridge removal — **not yet** (island + progressive assistant blocks).
4. Progress Wave 7 → **chrome done / island remains**.
