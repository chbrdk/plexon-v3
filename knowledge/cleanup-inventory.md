# Cleanup inventory — plexon-v3

**Date:** 2026-09-26  
**Inventor:** agent

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `lib/mui-shim.tsx` | reshape | `next.config.mjs` + `vitest.config.ts` alias; rg `@mui/material` → Board, Sidebar (orphan), RequireAdminRole, layout chrome, assistant legacy libs | Playbook + `keep-drop-backlog.md`: nicht blind löschen; `ignoreBuildErrors` hängt am Shim-Inventar (`msqdx-shim-inventory.md`). |
| `lib/mui-subpath-shims.ts` | reshape | Webpack/tsconfig aliases `@mui/material/{Popper,Toolbar,Snackbar,Slider}` | Gehört zur Shim-Schicht; erst nach Board-/Bridge-Cutover entfernen. |
| `lib/msqdx-react-bridge/` (`index.ts`, `primitives.tsx`) | reshape | Alias `@msqdx/react` in `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`; re-exportiert Prismion-Typen aus `msqdx-design-system` | `AGENTS.md`: Bridge nicht erweitern; Ziel `@msqdx/ui` + Board-Island ersetzen. |
| `components/board/ReactFlowBoard.tsx` | reshape | Einziger Prod-Import mit `from '@msqdx/react'` + `@mui/material` (`__tests__/ui-migrate-board.test.ts` erwartet das); Route `/board` live (`PATH_BOARD`, Admin-Nav) | Legacy Prismion-Insel; Collection Flows sind SoT (`keep-drop-backlog.md`). |
| `app/board/page.tsx` | keep | `app/board/layout.tsx` + `RequireAdminRole`; direkter Import `msqdx-design-system/.../prismion` + Bridge-Typen; Board-API `/api/board/complete` | Admin-only Live-Surface; Rebuild = Canvas + Typen entkoppeln, nicht Route streichen. |
| `components/auth/RequireAdminRole.tsx` | drop_needs_rebuild | Importiert in `app/board/layout.tsx`, `app/design-system/layout.tsx`; nutzt `@msqdx/react` + `@mui/material` | Gate vor Shim-Drop: auf `@msqdx/ui` umbauen (kleine Fläche, aber Runtime). |
| `components/projects/CollectionClientRoomPanel.tsx` | defer | Dashboard importiert Panel nicht (`rg CollectionClientRoomPanel` → nur Tests + Knowledge); API `client-room` + E2E `e2e-client-room.spec.ts` live | `keep-drop-backlog.md`: Panel hidden, **API keep**; nicht mit Sweeper löschen. |
| `lib/assistant/glass-chat-bubbles.ts`, `chat-layout.ts`, `chat-composer-styles.ts` | drop_needs_rebuild | rg: keine App/Component-Imports; nur `__tests__/glass-chat-bubbles.test.ts`, `assistant-chat-layout.test.ts`, `chat-composer-styles.test.ts` | Legacy MUI-`SxProps`-Helfer post Wave-7; Sweeper nur zusammen mit Test-Entfernung (`suite-cleanup.md` Fixture-Regel). |
| `components/InfoTooltip.tsx` | drop_safe | rg `InfoTooltip` → nur Definition, kein Import | Unreferenzierte Bridge-Komponente; Gatekeeper bestätigen, dann Welle 2. |
| `components/Sidebar.tsx` | drop_safe | rg `Sidebar` / `@/components/Sidebar` → keine Prod-Imports (nur Kommentar in `lib/theme-accent.ts`) | Tot legacy Nav; enthält `@msqdx/react` + MUI — Drop reduziert Shim-Druck ohne UX-Treffer. |
| `components/layout/PlexonPageChrome.tsx`, `components/layout/PlexonAppHeaderV2.tsx` | drop_safe | rg → keine App-Imports; `ui-migrate-assistant.md` / `ui-migrate-event-quick-check.md` markieren **drop**; EQC-Test assertiert Abwesenheit | Ersetzt durch AppShell; MUI-`Box` nur in diesen Dateien. |
| `components/assistant/AssistantSurfaceIconButton.tsx` | drop_safe | rg → nur Definition; Wave-7-Pfad nutzt DS-Buttons elsewhere | Unreferenziert; Bridge-Consumer ohne Call-Sites. |
| `knowledge/magazine-button.md`, `knowledge/magazine-lede.md` | drop_safe | rg Dateinamen / „magazine-button“ / „magazine-lede“ → keine Inbound-Links in Repo | Orphan-Kurzverweise auf `msqdx-ui`; kein Spec-/Test-Bezug — doc-only. |
| `knowledge/lab-tile-migration.md` | defer | Keine Inbound-Links; Inhalt = lokale EQC/`LabTile`-Arbeitshinweis | Nützlich für Dev-Iteration; nicht droppen ohne Ersatz in `ui-rebuild-msqdx-ui.md` / EQC-Knowledge. |
| `knowledge/plexon-setup.md` (Abschnitt `@msqdx/react`) | reshape | Zitiert in `scripts/docker-entrypoint.sh`, `single-platform-auth-troubleshooting.md`; beschreibt veralteten DS-Pfad | Doc an Bridge/`msqdx-ui`-SoT anpassen, nicht löschen. |
| `public/*.html` (Kernwerk, CARO, Lindenau, Louder) | keep | `lib/constants.ts` PATH_*_DEMO; Specs unter `specs/domain/*-landing-demo.md`; dedizierte `__tests__/*-html.test.ts` | Keine ungenutzten Assets — Demo-Prototypen mit Contract. |
| `locales/de.json` + `locales/en.json` (`designSystem.*` / `@msqdx/react`-Copy) | reshape | Admin-Route `/design-system` (`PATH_DESIGN_SYSTEM`, `app/design-system/page.tsx`) | UI-Copy still names legacy package; nach DS-Page-Rebuild textlich bereinigen. |
