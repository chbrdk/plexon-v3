# Collection Test Flow — staging smoke (Wave 1–7)

Routes (helpers in `lib/constants.ts`):

- Gallery: `/projects/{platformProjectId}/flows`
- Board: `/projects/{platformProjectId}/flows/{flowId}`
- Run: `POST /api/platform/projects/{id}/flows/{flowId}/run`
- **Wave 6** Live journey start: `POST /api/platform/projects/{id}/flows/{flowId}/run/journey`
- **Wave 6** Live journey poll: `GET /api/platform/projects/{id}/flows/{flowId}/journey-jobs/{jobId}`

## Preconditions

1. Staging DB has migration applied (`collection_test_flows` via `pnpm db:push` / `0005_collection_test_flows.sql`).
2. Collection has a **CHECKION** product binding (`externalProjectId`).
3. Plexon has `CHECKION_API_URL` + `CHECKION_API_TOKEN` (user API token) for BFF scans.
4. Session user can edit the Collection (same ACL as Knowledge Pack).
5. **Wave 2:** Collection also has an **AUDION** binding; Plexon has `AUDION_API_TOKEN` + platform API reachability (`AUDION_PLATFORM_API_URL` or Audion web origin `/api`).

## Wave 1 — page quality

1. Open Collection magazine → **Flows** chip (or go to gallery URL).
2. Create **page-quality** flow (URL empty → uses Collection domain).
3. On the board, press **Testen**.
4. Expect: scan node → score gate → `quality_ok` or `abandon`; verdict card shows `collectionReady` true/false with `overallScore`.
5. Reload board — `lastVerdict` / `lastRun` persist on the flow jsonb.

## Wave 2 — journey + quality

1. Create **journey + quality** flow from gallery.
2. Press **Testen** (run may take several minutes: Audion job then Checkion scan).
3. Expect: `journey` node completes → scan uses journey `finalUrl` (or start URL fallback).
4. Verdict shows `taskCompleted`, `validEvidence`, `qualityPassed`, `collectionReady`.
5. `lastRun` includes `audionJobId`, `stepUrl`, `scanId` — same URL family in Audion steps and Checkion scan.
6. Optional: open Audion study / Checkion result deep links when ids are present.

## Wave 3 — issue gates + dossier

1. Create **Page quality + issues** (or journey variant).
2. Press **Testen**.
3. Expect: after score gate, `issue_gate` evaluates `critical_issues` (default minCount 1).
4. Verdict shows `issueGate: pass|fail` and critical counts; abandon if criticals ≥ 1 even when score passes.
5. Strip link **Open Issues dossier** → CHECKION `/results/{scanId}/issues`.

## Wave 4 — Study rollup

1. Create a **journey** template (with or without issues) and **Testen**.
2. After run: Audion Study evaluates; wave notes / report include Collection verdict + cross-product rates.
3. Open **Open in AUDION** — Evaluate / Soft-Q notes should mention Collection rollup.
4. Knowledge Pack `research_brief` may gain section **Collection Test Flow** (optional distillate).
5. `lastRun` flags: `waveEvaluateOk`, `waveRollupOk`, `knowledgeDistillateOk`.

## Wave 5 — immersive n8n-style board (canvas parity)

1. Open a flow board — confirm full-bleed immersive canvas (React Flow `Background` + `MiniMap` + `Controls`), toolbar dock top, palette FAB (`body.msqdx-flow-board-active` via `@msqdx/ui` `FlowBoardStage`).
2. Palette → **Journey** section (`start, prompt, observe, action, gate, message, success, abandon, measure`) and **Quality** section (`scan, score_gate, issue_gate, quality_ok`); adding a node drops it on canvas and marks the board dirty.
3. Drag a node → position persists after **Save** (PATCH `flow` with the React-Flow-derived document) and after reload.
4. Select a node → inspector dock opens on the right showing design fields (label/text/note/url/urlKey/threshold/gateCondition as applicable).
5. Connect a `gate`/`score_gate`/`issue_gate` node's two handles → edges default to `when` then `otherwise`; label renders `wenn` / `sonst` on canvas.
6. **Undo** restores the previous graph snapshot (session history, no reload); **Reset** restores the template snapshot loaded on open.
7. Journey templates (`createJourneyQualityTemplate` / `…IssuesTemplate`) now render first-class canvas nodes `start → action → success → scan → score_gate → quality_ok/abandon` (no opaque `journey` blob node) — verify node chips show human labels, not raw ids.

## Wave 6 — client-orchestrated live run

1. On a journey+quality flow, press **Testen** — expect immediate `POST …/run/journey` (creates Study+Wave, starts, returns `{ studyId, waveId, jobId }` without waiting for completion).
2. Board polls `GET …/journey-jobs/{jobId}` every ~2s; node run-state pips animate `idle → active → done` along the default path (`start → action → success`), latest agent step text/screenshot appears as `runOutput` on the active node.
3. **Stop** clears the poll interval (best-effort — does not cancel the Audion job server-side).
4. On job completion, board auto-hands off to quality: `POST …/run` with `{ phase: 'quality', audionJobId, audionStudyId, audionWaveId, stepUrl, taskCompleted, journeyValidEvidence }` — verify the scan uses `stepUrl` (journey `finalUrl`), not the flow's static start URL.
5. Quality-only flows (no journey segment): **Testen** skips `run/journey` entirely and calls `POST …/run` directly (`{}` or `{ phase: 'quality' }` with no journey ids — server treats it as a normal quality-only run, unaffected by Wave 6 handoff).
6. Inspector panel on a journey node shows the accumulated step list (action/target/result) for the current run — "Add to note" button appends the latest step summary to the node's `note` field.
7. Run strip surfaces status text, step count, and (once ids are known) deep links to the Audion study/wave and Checkion scan/issues.
8. On a live `gate` node: **Wenn → Agent** / **Sonst → Agent** posts `…/journey-jobs/{jobId}/gate-branch`.
9. **Agent-Segment** on prompt/observe/action/message posts `…/hybrid-segment`.
10. After quality handoff, Soft-Q chip may appear (keys + Collection rollup flag) from `GET …/wave-summary`.

## Wave 7 — hardening / parity check

1. Re-run Waves 1–4 flows through the new board UI end-to-end (page-quality, journey+quality, issue gates, Study rollup) — verdict/lastRun semantics unchanged, only the canvas + live-run UX is new.
2. Confirm `documentHasJourneySegment` still correctly detects legacy `journey`-kind docs (back-compat) alongside new first-class Audion node docs.
3. Confirm Save round-trips edited canvases without losing `gateCondition`, `threshold`, `minCount`, `urlKey`, or edge `when`/`edgeKind` — reload after Save and diff.
4. `pnpm vitest run __tests__/collection-flow-canvas.test.ts __tests__/collection-test-flow.test.ts __tests__/collection-test-flow-api.test.ts` green in CI before shipping.

## DS chrome parity (Option A)

1. Storybook (`URL_MSQDX_UI_STORYBOOK`): `Organisms/FlowBoardStage` → **MagazineBoard** — node cards, docks, inspector, run strip share `.msqdx-flow-*`.
2. Side-by-side: Audion `/studies/flows/{flowId}` vs Plexon `/projects/{id}/flows/{flowId}` — same chrome family (stage, toolbar, palette FAB, RF node card, inspector sections, run strip). Domain (Testen / Soft-Q / Checkion / Collection verdict) differs; classnames do not.
3. Confirm `body.msqdx-flow-board-active` (not `audion-flow-board-active` / plexon fork) while the board is mounted.
4. Confirm no parallel board CSS: Audion globals have no `.audion-flow-*` SoT; Plexon has no `styles/plexon-flow-board.css`.

## Failures to check

- Missing Checkion binding → API 400 with clear message.
- Missing Audion binding on journey-quality → API 400.
- Missing/invalid token → run error verdict, not silent hang.
- Score &lt; 70 → `abandon`, `collectionReady=false`, evidence still valid if score present.
- Journey task fail + quality pass → `collectionReady=false` (`taskCompleted` false).
- Score pass + ≥1 critical → issue gate fail → `abandon`, dossier link still available.
- Wave evaluate/PATCH failure → Collection run still succeeds; rollup flags false (best-effort).
