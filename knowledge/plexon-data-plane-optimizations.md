# Plexon data plane — storage & transfer optimizations

**Status:** Accepted program — 2026-09-12  
**Companions:**  
- Spec Wave A: `specs/domain/platform-outbox-delivery.md`  
- Spec Wave B: `specs/domain/collection-read-model.md`  
- Spec Wave C/D notes in those specs + `specs/domain/collection-knowledge-pack.md` (brand freshness)  
- Paths: `knowledge/paths.md`  
- Ownership: `knowledge/platform-surface-ownership.md`  
- Sync ops: `knowledge/collection-knowledge-sync.md`  
- Federation: `knowledge/platform-federation-contract.md`

## Verdict

The **three-layer model is correct** and must not be collapsed:

| Layer | SoT | Notes |
|-------|-----|-------|
| Identity | `platform_projects` + bindings | Thin product upsert only |
| Shared brief | Collection Knowledge Pack facets | Distillates, size-capped |
| Product dossiers | Checkion / Audion / Brandion / Creation / Videon / … | Never full-mirrored into Plexon |

Pain with growth is **delivery and read fan-out**, not “where to store”:

- Synchronous HTTP mirror loops (`syncPlatformProjectToProducts`)
- Knowledge autosync soft-skip → silent pack drift
- Magazine / Assistant N+1 live product GETs + full facet loads
- Cap-50 accessible Collection lists
- Brand facet reserved while Brandion already holds guideline SSOT
- Hard-delete leaves product orphans with no tombstone

## Target shape

```text
Write (identity / pack / lifecycle)
  → transactional outbox
  → retryable fan-out (mirrors, tombstones, publish retries)
  → Knowledge Pack (freshness on facets)
  → rebuildable Collection projection (read model)
  → Magazine / Assistant / pickers read projection (+ paginated lists)
```

## Waves

### Wave A — Durable delivery

- Table `platform_outbox` + drain worker (`lib/platform-outbox.ts`)
- **Background drain:** first `getDb()` boots `lib/platform-outbox-scheduler.ts` (default every 30s; `PLEXON_OUTBOX_DRAIN_ENABLED=0` to disable). Not started from `instrumentation.ts` (Edge bundle / missing-module trap on Coolify)
- Mirror sync failures enqueue retry; drain updates binding `sync_status`
- Facet `freshness`: `fresh` | `publish_pending` | `publish_failed` | `stale`
- Service mark: `POST …/knowledge/facets/:facetId/freshness` (Audion/Checkion soft-skip)
- Append-only `collection_knowledge_pack_events` on facet writes
- Soft-skip remains product-local, but Plexon surfaces freshness + ops metrics

### Wave B — Collection read model

- Table `collection_projections` (rebuildable JSON snapshot)
- Built from identity + pack teasers + binding cards (+ optional cached capability summaries)
- Hub / Assistant context boot prefer projection over N product GETs
- Accessible Collections + mirror sync: cursor pagination (default page size 50)

### Wave C — Brand facet

- Brandion may publish `brand` with refs only (`guidelineRef`, `voiceSummary`, `tokenRefs`)
- Token bytes stay on Brandion `active-pack`; no dump into KP
- Readiness / magazine treat active brand as filled when refs present

### Wave D — Lifecycle & observability

- Hard-delete enqueues `capability_tombstone` before cascade
- Canonical deep-link query: `platformProjectId` (`platformProjectHint` = legacy alias)
- Ops: `GET /api/platform/ops/data-plane` · drain `POST /api/platform/ops/outbox/drain`

## Non-goals

- Shared product database
- Knowledge graph / second SoT store
- Inflating thin upsert with pack or dossier bodies
- Full personas / issues / TipTap / media binaries in Plexon
- Platform-wide event bus as mandatory transport

## Success criteria

- Mirror / publish failures are **visible and retryable**
- Magazine / Assistant primarily read **one projection**
- Pack stays small and faceted; dossiers stay product-local
- Brand context in Plexon without token duplication
