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

1. Deploy brandion-v3 (`hta84est51lwzkqol3hd6wig`) then plexon-v3 (`n6f9gy85xsk3a0txflzavk3j`).
2. Collection with Brandion `in_sync` → open Flow → Bausteine **Marke**.
3. Guideline (`gl-demo-1` / `gl-test-cd`) → Brand Measure (`fixtureId` e.g. `demo-landing-pass`) → Compare `brand.failCount eq 0`.
4. **Testen** → strip shows `brand.*` catalog + **BRANDION Evaluate** deep link.

**2026-08-10:** unit tests green; Coolify deploys queued for brandion + plexon after commits `2c86cba` / `17e9ef5`. Manual UI smoke on staging Collection after deploy settles.
