# UI migrate — Board + legacy DS removal

**Status:** Accepted (chrome) — Wave 7 partial — 2026-07-31  
**Route:** `/board*`  
**Implements:** `app/board/**` · `components/board/**` · bridge/shim deletion (deferred)

**Not this:** Collection Test Flow (AUDION + CHECKION orchestration on `/projects/[id]/flows`) — see `specs/domain/collection-test-flow.md`. That surface is new magazine workspace chrome + capability dispatch; it must **not** grow the Prismion/`@msqdx/react` island.

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

- `components/board/ReactFlowBoard.tsx` — **only** remaining board UI surface on bridge + MUI
- Board libs (`lib/board-*.ts`) — type/utils imports from bridge (`Prismion`, `wouldOverlap`)

## Shrink progress (2026-09-26 App-Finalisierung Prio 1 slice)

- `RequireAdminRole` cleared off MUI/`@msqdx/react` (used by `/board` + `/design-system` layouts).
- Assistant `ui-visual` / `ui-typography` no longer import bridge or MUI `alpha`.

## Acceptance

1. Board page chrome has no direct `@mui/material` imports. ✅
2. Prismion adapter documented as the only board legacy island. ✅
3. Full bridge removal — **not yet** (canvas island + board type libs).
4. Progress Wave 7 → **chrome done / island remains**; gate chrome cleared 2026-09-26.
