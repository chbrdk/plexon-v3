# Collection read model (Wave B + D)

**Status:** Accepted — 2026-09-12  
**Program:** `knowledge/plexon-data-plane-optimizations.md`  
**Companions:** `specs/domain/platform-outbox-delivery.md` · `specs/domain/collection-knowledge-pack.md` · `lib/collection-projection.ts`

## Goal

Give Magazine, Assistant context boot, and Collection hub a **rebuildable projection** so they do not N+1 live product GETs + full Knowledge Pack on every paint.

## Projection row

Table `collection_projections`:

| Field | Meaning |
|-------|---------|
| `platform_project_id` | PK → `platform_projects.id` ON DELETE CASCADE |
| `revision` | Monotonic rebuild counter |
| `snapshot` | JSON `CollectionProjectionSnapshot` |
| `updated_at` | timestamptz |

### Snapshot shape (logical)

```ts
type CollectionProjectionSnapshot = {
  identity: {
    id: string
    name: string
    domain: string | null
    status: string
    companyId: string
  }
  bindings: Array<{
    productId: string
    syncStatus: string
    externalProjectId: string | null
    syncMessage: string | null
  }>
  knowledgeTeasers: Array<{
    facetId: string
    preview: string
    readiness: 'filled' | 'empty' | 'reserved'
    freshness: 'fresh' | 'publish_pending' | 'publish_failed' | 'stale'
    updatedAt: string
  }>
  capabilityCards: Array<{
    productId: string
    label: string
    summaryLine: string | null
    stale: boolean
  }>
  brand: {
    status: 'reserved' | 'active'
    guidelineRef: { guidelineId: string; version: string; url?: string } | null
    voiceSummary: string | null
  }
  builtAt: string
}
```

## Rebuild triggers

- Knowledge pack facet write / publish
- Binding sync status change
- Outbox `projection_rebuild`
- Explicit `POST /api/platform/projects/:id/projection/rebuild` (session admin / service)

## Consume

- `GET /api/platform/projects/:id/projection` — session or service; rebuilds if missing
- Assistant Collection context SHOULD prefer this over dashboard fan-out when present
- Live product summaries remain available for deep work bands (report depth), not first paint

## Pagination (Access Model B lists)

`listAccessibleCollectionsForUser` and bulk mirror sync accept:

| Param | Default | Max |
|-------|---------|-----|
| `limit` | 50 | 100 |
| `cursor` | none | opaque name+id cursor |

Response adds `nextCursor: string | null` (replaces sole reliance on `truncated` boolean; `truncated` remains true when more pages exist).

## Deep-link convention (Wave D)

Canonical query param: **`platformProjectId`**.

Legacy alias: `platformProjectHint` (Checkion / Audion admin). New launch helpers MUST set `platformProjectId`; may also set the hint for older product routes.

Constants: `lib/platform-deep-link-params.ts`.

## Ops (Wave D)

`GET /api/platform/ops/data-plane` (service secret):

```json
{
  "outbox": { "pending": 0, "dead": 0, "oldestPendingAt": null },
  "bindings": { "failed": 0, "pending": 0 },
  "knowledge": { "facetsStaleOrFailed": 0 },
  "projections": { "rows": 0 }
}
```

## Brand (Wave C)

When Brandion publishes `brand` with `status: 'active'` and a `guidelineRef`, projection `brand` mirrors that; magazine readiness is `filled`. Token bytes never enter the snapshot.

## Non-goals

- Projection as write SoT
- Embedding full TipTap / scan issues / media binaries
- Removing product BFFs for deep capability catalogs
