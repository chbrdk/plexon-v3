# Collection Flow — VIDEON (V6 Media)

**Date:** 2026-09-08  
**Spec:** `specs/domain/collection-test-flow.md` § Family E · `capability-catalog.md` VIDEON set · `videon-integration.md` V6

## Nodes

| Kind | Palette group | Role |
|------|---------------|------|
| `videon_media` | Media | Config — `mediaAssetId` for downstream Media actions |
| `videon_analysis_run` | Media | Enqueue analysis → `media.analysis.*` |
| `videon_cut_create` | Media | Create Cut → `media.cut.*` (confirm / human gate) |
| `videon_export_run` | Media | Enqueue export → `media.export.*` (**Flow first**) |

## Auth

Plexon → VIDEON: `PLEXON_SERVICE_SECRET` + `X-Plexon-User-Id` (Access Model B). Same pattern as Assistant frame/preview/action proxies.

## Capability Catalog

When `CAPABILITY_CATALOG_RUNTIME` is on, Flow kinds map to `videon.analysis.run` / `videon.cut.create` / `videon.export.run` shared executors. Default remains **off** (direct Product HTTP still works from the Flow segment).

## Cross-product template

`buildCreationVideonBrandFlowTemplate` — Creation asset placeholder → `videon_analysis_run` → `brand_measure` (or Brandion guideline check). Domain state stays in CREATION / VIDEON / BRANDION; Plexon only orchestrates.

## Hit-Card writes

Assistant `video_hit_strip` may confirm `analysis_run`, `brand_check_run`, `cut_create` via `/api/assistant/videon-action`. No export button on cards.

## Smoke

1. Deploy plexon-v3 after V6 Media commit.  
2. Collection with VIDEON binding → Flow → Bausteine **Media**.  
3. `videon_media` (asset id) → `videon_analysis_run` → Compare `media.analysis.status`.  
4. Assistant scene search → Hit-Card **Cut** → Confirm.

## V7 (ops gate)

Production rollout / legacy disposition lives in VIDEON:

- Spec: `videon-v3/specs/domain/v7-production-rollout.md`
- Runbook: `videon-v3/knowledge/v7-production-runbook.md`
- Upstream checklist: `specs/domain/videon-integration.md` § V7

Do not treat V6 Flow kinds as production-complete until V7 E1–E6 + sign-off.
