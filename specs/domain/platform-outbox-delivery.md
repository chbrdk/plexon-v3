# Platform outbox delivery (Wave A)

**Status:** Accepted — 2026-09-12  
**Program:** `knowledge/plexon-data-plane-optimizations.md`  
**Companions:** `knowledge/collection-knowledge-sync.md` · `knowledge/platform-provisioning-rollout.md` · `lib/platform-outbox.ts`

## Goal

Replace silent best-effort sync with a **durable outbox** so Collection mirror upserts, lifecycle tombstones, and knowledge-publish retries are retryable and observable.

## Outbox row

| Field | Meaning |
|-------|---------|
| `id` | UUID |
| `kind` | `capability_mirror_sync` \| `capability_tombstone` \| `knowledge_publish_retry` \| `projection_rebuild` |
| `payload` | JSON (platformProjectId, productIds?, facetId?, source?, …) |
| `status` | `pending` \| `processing` \| `done` \| `dead` |
| `attempts` | int |
| `max_attempts` | default 8 |
| `next_attempt_at` | timestamptz |
| `last_error` | text \| null |
| `created_at` / `updated_at` | timestamptz |

## Behaviors

1. **Mirror sync:** `syncPlatformProjectToProducts` still attempts immediate HTTP upsert. Any product failure enqueues `capability_mirror_sync` for that Collection (+ optional `onlyProducts`). Drain re-runs upsert and updates binding `sync_status`.
2. **Tombstone:** Before admin hard-delete cascade, enqueue `capability_tombstone` with last-known external ids / product list. Drain best-effort DELETEs or archive-only calls when products support them; failures → `dead` with message (products may remain orphans — documented).
3. **Knowledge publish retry:** Products or Plexon may enqueue `knowledge_publish_retry` when a publish soft-fails. Drain marks facet `freshness` and optionally re-notifies (Phase 1: mark `publish_failed` / clear pending).
4. **Projection rebuild:** After pack or binding changes, enqueue `projection_rebuild` (or rebuild inline). Drain calls `rebuildCollectionProjection`.

## Facet freshness

Every `FacetDocument` may carry:

```ts
freshness?: 'fresh' | 'publish_pending' | 'publish_failed' | 'stale'
```

| Value | Meaning |
|-------|---------|
| `fresh` | Last write succeeded and is current SoT |
| `publish_pending` | Intent recorded; distillate not yet applied |
| `publish_failed` | Last publish/retry failed |
| `stale` | Product signaled dossier newer than pack (manual re-sync CTA) |

Default for successful writes: `fresh`. Missing field treats as `fresh` for older rows.

## Pack events

Table `collection_knowledge_pack_events` (append-only):

- `id`, `pack_id`, `facet_id`, `revision`, `actor_type`, `actor_user_id`, `product_id`, `run_id`, `source_uri`, `patch_summary`, `created_at`

Written on successful facet patch / publish.

## Drain API

- `POST /api/platform/ops/outbox/drain` — service secret + contract; body `{ limit?: number }` (default 20, max 100)
- Returns `{ processed, done, dead, remainingPending }`

## Ops metrics

See Wave D in `specs/domain/collection-read-model.md` § Ops — shared `GET /api/platform/ops/data-plane`.

## Non-goals

- Replacing product-local durable queues (e.g. Videon)
- Guaranteed cross-product 2PC
- Silent soft-skip without freshness visibility
