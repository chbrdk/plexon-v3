# Msqdx / MUI shim inventory (Wave-7 start)

**Date:** 2026-08  
**Context:** Parity Phase C — shrink bridge surface; only flip `typescript.ignoreBuildErrors` when the remaining set is small and typed cleanly.

## Build gate

`next.config.mjs` still has `typescript.ignoreBuildErrors: true` because production imports still resolve through:

- `@msqdx/react` → `lib/msqdx-react-bridge/`
- `@mui/material` → `lib/mui-shim.tsx` (+ subpath shims)
- `@msqdx/tokens` → `lib/msqdx-tokens-shim.ts`

Rough consumer count (app/components/lib, excluding `__tests__`): **~30+ `@msqdx/react`**, **~35+ `@mui/material`** — too large to remove the build ignore without a dedicated typing pass.

## Cleared in Parity Phases A–C (no longer on MUI / `@msqdx/react`)

- EQC page + workflow clients (Wave 6)
- `EventQuickCheckReportSections` + `ReportSectionHeader`
- `ReportCollectionBar`, `ReportBinaryDownloadButton`, `ReportPdfDownloadButton`
- `PublicReportView`, `app/share/reports/[token]/page.tsx`
- Dashboard admin user edit → `/admin/users/[id]` (`AdminUserEditForm`)

## Remaining islands (keep bridge intentionally)

| Area | Why still shimmed |
|------|-------------------|
| `components/assistant-ui/**` generative blocks | Progressive Wave-7; heavy MUI layout/`@msqdx/react` cards |
| `AssistantSurfaceIconButton`, `ReportPinButton`, phase indicators | Icon/button bridge |
| `components/board/ReactFlowBoard.tsx` | Prismion / canvas island |
| `Sidebar`, layout chrome leftovers | Low priority |
| `lib/assistant/ui-visual.ts`, typography helpers | Types from bridge |

## Next cut order (suggested)

1. Assistant generative atoms (`UiText`, `UiBadge`, …) → `@msqdx/ui` Text/Chip  
2. `UiBlockSurface` / metric tiles  
3. Board: document as permanent island **or** rewrite  
4. Re-run `tsc --noEmit`; if clean, set `ignoreBuildErrors: false`
