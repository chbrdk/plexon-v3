# EQC magazine chapter split — E-E-A-T & GEO-Empfehlungen

Stand: 2026-08-10  
Spec: `specs/domain/ui-migrate-event-quick-check.md`

## Intent

Scrollytelling chapters stay one job each. E-E-A-T ledger and GEO recommendation moves are **top-level** `.plexon-dash-band` chapters, not nested inside the GEO spread.

## Band order (done results)

1. Cover (masthead)
2. … market / domain / persona …
3. **GEO** — snapshot, share-of-voice, citations, optional questions (`EventQuickCheckGeoMagazineSection`)
4. **E-E-A-T** — ledger + reading + gaps (`EventQuickCheckEeatMagazineSection`) when `layout.showGeoEeat`
5. **GEO-Empfehlungen** — moves gallery (`EventQuickCheckGeoRecommendationsMagazineSection`) when `layout.showGeoRecommendations`
6. Insights / appendix

## Layout flags

`resolveEventQuickCheckDashboardLayout`:

- `geoSpan` / main GEO band → GEO **core** only (metrics, citations, competitors, questions-in-geo, failed/partial) — **not** E-E-A-T or recommendations alone
- `showGeoEeat` / `showGeoRecommendations` drive the dedicated bands
