# Collection Test Flow — staging smoke (Wave 1–4)

Routes (helpers in `lib/constants.ts`):

- Gallery: `/projects/{platformProjectId}/flows`
- Board: `/projects/{platformProjectId}/flows/{flowId}`
- Run: `POST /api/platform/projects/{id}/flows/{flowId}/run`

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

## Failures to check

- Missing Checkion binding → API 400 with clear message.
- Missing Audion binding on journey-quality → API 400.
- Missing/invalid token → run error verdict, not silent hang.
- Score &lt; 70 → `abandon`, `collectionReady=false`, evidence still valid if score present.
- Journey task fail + quality pass → `collectionReady=false` (`taskCompleted` false).
- Score pass + ≥1 critical → issue gate fail → `abandon`, dossier link still available.
- Wave evaluate/PATCH failure → Collection run still succeeds; rollup flags false (best-effort).
