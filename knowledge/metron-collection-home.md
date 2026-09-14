# Collection home — METRON capability tile

**Date:** 2026-09-14

## Why
Wave 3 polish: Collection `/projects/[id]` shows METRON beside CHECKION/AUDION/BRANDION with live BFF counts.

## How
- Product GET `{METRON}/api/platform/provisioning/projects/{id}` → `datasetCount` / `kpiCount` / `dashboardCount`
- Plexon BFF `GET /api/platform/projects/{id}/dashboard` → `metron` + `links.metronProject`
- Launch: `{METRON}/projects?platformProjectId=` (`lib/metron-launch-url.ts`)
- UI: Overview chapter + work-band `MetronCapabilityView`
- **Ask in Assistant:** `pathAssistantWithProjectAndDraft(projectId, askMetronDraft)` → `/assistant?project=…&draft=…` (composer seed, one-shot)

## Paths
Staging METRON / launch query / draft param documented in `knowledge/paths.md`.
