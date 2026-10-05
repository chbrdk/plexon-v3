# content/help

Suite Docs & Help content SSOT (Wave 0–3).

- Spec: `specs/domain/suite-help-docs.md`
- Concept: `knowledge/suite-help-docs.md`
- Paths: `lib/paths/help.ts`

Edit `manifest.json` and matching `articles/<id>.{en,de}.md` together. Locale pairs and visibility are enforced by `__tests__/suite-help-docs.test.ts`.

Walkthroughs (Wave 3): edit `walkthroughs/index.json` (bilingual `title`/`task`/`steps`). Loader: `lib/help/walkthroughs.ts`. Anchors use `[data-help-anchor='…']` in product chrome (Plexon NavRail `dataHelpAnchor`).

Wave 4 CHECKION how-tos are derived from `knowledge/tutorials/checkion-*` (user SSOT here; production scripts stay under `knowledge/tutorials/`).
Wave 5 BRANDION how-tos are derived from `knowledge/tutorials/brandion-*`.
