# Creation MagazineTemplate consume (EQC Mag PDF)

**Status:** Accepted · **Date:** 2026-08-15  
**Phase:** Print Mag WYSIWYG Phase 5  
**Upstream:** `creation-v3/specs/domain/magazine-template.md` · `creation-v3/specs/api/magazine-templates.md`  
**Knowledge:** `knowledge/eqc-magazine-pdf.md` · `creation-v3/knowledge/magazine-template-publish.md`

## Goal

Quick Scan Magazin-PDF prefers a **published** Creation `MagazineTemplate` for the Collection (`platformProjectId`) with role `quick-check-magazine`. Report data binds into scene nodes via `props.dataSlot` (never layout `props.slot`). Legacy hard-coded `eqc-magazine-pdf.tsx` remains the fallback.

## Discovery

1. Resolve Creation service base via `getCreationServiceApiUrl()` (`CREATION_API_URL` → `NEXT_PUBLIC_CREATION_URL`). Paths in `lib/constants.ts` / `lib/paths/creation-magazine-templates.ts`.
2. `GET {CREATION}/api/magazine-templates?platformProjectId=&role=quick-check-magazine&latest=1`
3. Bind `EventQuickCheckReportModel` → snapshot using slot schema.
4. `POST {CREATION}/api/scenes/{snapshot.id}/pdf` with `{ scene: boundSnapshot }` → PDF bytes.

## Fallback (documented)

Prefer Creation when:

- Env `EQC_CREATION_MAGAZINE_TEMPLATE` is unset or truthy (`1` / `true` / `yes`), **and**
- Collection `platformProjectId` is present on the report, **and**
- Creation base URL is configured, **and**
- A published template is found, **and**
- PDF render from Creation succeeds.

Force legacy with `EQC_CREATION_MAGAZINE_TEMPLATE=0` (or `false` / `off`). Missing template / network / 4xx–5xx → legacy `EqcMagazinePdfDocument` without failing the export.

## dataSlot keys (bind)

| dataSlot | Node | Report source |
|----------|------|---------------|
| `eqc.cover` | PrintCover | meta title/domain + executive fazit; KPI Lede children from `executive.kpiTiles` |
| `eqc.cover.kpis` | PrintCover | KPI tiles only |
| `eqc.domain.issues` | PrintTable | `domain.topIssues` |
| `eqc.domain.comparison` | PrintTable | `domainComparison.rows` |
| `eqc.geo.competitors` | PrintRankedList | `geo.competitors` |
| `eqc.geo.recommendations` | PrintRankedList | `geo.recommendations` |
| `eqc.personas` | PrintPersonaGrid | `personas` / `persona` |
| `eqc.persona` | PrintPersonaCard | first persona |

## Requirements (EARS)

1. WHEN a published template exists for the Collection + role and the prefer flag is on, the system MUST attempt Creation PDF render before legacy.
2. WHEN Creation is unavailable or no template exists, the system MUST fall back to `EqcMagazinePdfDocument`.
3. WHEN binding, the system MUST write report payloads into Mag-readable props (`columns`/`rows`, RankedRow children, persona slots) keyed by `dataSlot`, not layout `slot`.
