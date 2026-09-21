# CHECKION quick scan from PLEXON (v3)

Stand: **2026-09-21**

## Problem

Assistant `quick_scan` called legacy `POST {CHECKION}/api/scan`. That route **does not exist** on checkion-v3 (only contracts `POST /api/scans`). Staging answered with a login redirect → workflow failed.

## Fix

`lib/integrations/checkion-scan-client.ts` → `runCheckionQuickScan`:

1. Resolve `checkionProjectId` (binding) or auto-create `Quick Scan · {host}` via `POST /api/projects`
2. `runCheckionSingleScan` → `POST /api/scans` `mode=single` + poll detail
3. `fetchCheckionScanIssues` → map into Assistant `ScanResultPreview`

Canonical paths: `checkionApiScans` / `checkionApiScanDetail` / `checkionApiScanIssues` in `lib/paths/checkion-api.ts`.

## Tests

`__tests__/checkion-quick-scan-v3.test.ts`

## Smoke

1. PLEXON Assistant: “Scan https://example.com” (with or without Collection Checkion binding)
2. Expect workflow steps complete and score UI
3. Open result link → checkion-v3 `/results/{id}/overview`
