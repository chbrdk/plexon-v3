# EQC Distributions band (Checkion parity)

Stand: 2026-08-11  
Spec: `specs/domain/ui-migrate-event-quick-check.md`  
UI: `components/event-quick-check/EventQuickCheckDistributionsMagazineSection.tsx` · `EqcDistributionDonut.tsx`  
Data: `GET` Checkion `checkionApiDomainScanOverview` → `DomainScanPreview.distributions` → `report.distributions`

## Intent

Own magazine band **after Domain & Barrierefreiheit** mirroring Checkion Overview “Distributions / Share across the corpus” (Readability, Eco grades, Link mix). Visual language ports Checkion donut/grid CSS under `plexon-eqc-dist*` / `plexon-eqc-donut*`.

- Distributions appear on **reload of existing runs** via `hydrateEventQuickCheckReportDistributions` (Checkion overview backfill) — not only on newly completed scans.