# Cleanup inventory — plexon-v3

**Date:** 2026-09-26 (Board cutover)

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `lib/board/prismion.ts` · `lib/board/board-ui.tsx` | keep | Board SoT | Replaced `@msqdx/react` for board |
| `components/board/ReactFlowBoard.tsx` | keep | No `@msqdx/react` / `@mui/material` | ReactFlow island on local board modules |
| `lib/msqdx-react-bridge/` | drop_safe **done** 2026-09-26 | Deleted | Bridge + webpack/tsconfig/vitest aliases gone |
| `lib/mui-shim.tsx` · `lib/mui-subpath-shims.ts` | drop_safe **done** 2026-09-26 | Deleted | Same |
| `lib/msqdx-tokens-shim.ts` | keep (facade) | `@msqdx/tokens` alias → `@msqdx/ui-tokens` values | No design-system tokens import (2026-09-26). |
| `components/auth/RequireAdminRole.tsx` | keep | `@msqdx/ui` Spinner | Cleared earlier |
| `lib/assistant/ui-visual.ts` · `brand-color.ts` | keep | Local alpha/BrandColor | Cleared earlier |
| `components/projects/CollectionClientRoomPanel.tsx` | defer | API keep; panel hidden | Product call |
| `knowledge/plexon-setup.md` (`@msqdx/ui` / board) | reshape **done** 2026-09-26 | Ops docs | Points at `@msqdx/ui` + `lib/board/*` |
| `locales` designSystem copy | reshape **done** 2026-09-26 | `/design-system` | No `@msqdx/react` package claim |
| `public/*.html` demos | keep | Specs + tests | Contract demos |
