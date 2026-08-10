# Collection Flow — Brandion (Wave 24)

**Date:** 2026-08-10  
**Spec:** `specs/domain/collection-test-flow.md` § Family D

## Nodes

| Kind | Palette group | Role |
|------|---------------|------|
| `guideline` | Marke | Config — Collection Brandion guideline id |
| `brand_measure` | Marke | Sync Measured evaluate via Brandion `POST …/analysis-runs` |

Catalog root `brand.*` — see flow spec. Compare presets: `brand.passRate >= 0.8`, `brand.failCount eq 0`.

## Machine auth

Plexon calls Brandion with shared `PLEXON_SERVICE_SECRET` + federation contract headers. Brandion analysis-runs accept that secret (same as provisioning).

## Paths

- Client: `lib/integrations/brandion-analysis-runs-client.ts`
- API helpers: `lib/paths/brandion-api.ts` → `apiBrandionGuidelineAnalysisRuns`
- Brandion evaluate deep link: existing `pathBrandionGuideline` + evaluate segment

## Smoke

Collection with Brandion `in_sync` → Bausteine **Marke** → Guideline → Brand Measure (`fixtureId`) → Compare → Testen.
