# PLEXON v3 — Paths and URLs

- Repo root: `/Users/christoph.bordeck/Desktop/GITHUB/plexon-v3`
- Shared UI repo: `/Users/christoph.bordeck/Desktop/GITHUB/msqdx-ui`
- Shared UI package dep: `../msqdx-ui/packages/ui`
- Shared token package dep: `../msqdx-ui/packages/ui-tokens`
- Consumer barrels: `lib/msqdx-ui.ts` · `lib/msqdx-ui-shell.ts`
- Shell config: `lib/shell-paths.ts` (`shellPaths` / `paths`)
- Route constants: `lib/constants.ts` · `lib/paths/*`
- Default app port: `3334` (local) · Coolify/Docker: `3000`
- Public staging URL: `https://plexon-v3.projects-a.plygrnd.tech`
- Companion: `https://audion-v3.projects-a.plygrnd.tech`
- CHECKION staging companion: `https://checkion-v3.projects-a.plygrnd.tech` (`NEXT_PUBLIC_CHECKION_URL` / `URL_CHECKION_V3`)
- Federation contract: `2026-05-plexon-federation-v3`
- Rail dock storage key: `plexon.v3.railDock`
- Default theme: `msqdx-dark` (`data-theme` on `<html>`)
- Specs: `specs/domain/app-shell.md`
- UI rebuild progress: `knowledge/ui-rebuild-msqdx-ui.md`
- Prod freeze: `chbrdk/PLEXON` — never deploy Coolify prod from this repo
