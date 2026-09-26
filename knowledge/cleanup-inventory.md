# Cleanup inventory — plexon-v3

**Date:** 2026-09-26 (Board cutover)

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `lib/board/prismion.ts` · `lib/board/board-ui.tsx` | keep | Board SoT | Replaced `@msqdx/react` for board |
| `components/board/ReactFlowBoard.tsx` | keep | No `@msqdx/react` / `@mui/material` | ReactFlow island on local board modules |
| `lib/msqdx-react-bridge/` | drop_safe | No app imports left | Dead after board cutover — purge aliases next |
| `lib/mui-shim.tsx` · `lib/mui-subpath-shims.ts` | drop_safe | No app imports left | Same — purge with alias removal |
| `components/auth/RequireAdminRole.tsx` | keep | `@msqdx/ui` Spinner | Cleared earlier |
| `lib/assistant/ui-visual.ts` · `brand-color.ts` | keep | Local alpha/BrandColor | Cleared earlier |
| `components/projects/CollectionClientRoomPanel.tsx` | defer | API keep; panel hidden | Product call |
| `knowledge/plexon-setup.md` (`@msqdx/react` section) | reshape | Ops docs | Point at `@msqdx/ui` / board modules |
| `locales` designSystem copy | reshape | `/design-system` | Text cleanup |
| `public/*.html` demos | keep | Specs + tests | Contract demos |
