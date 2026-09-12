/**
 * Durable platform outbox — Wave A.
 * Spec: specs/domain/platform-outbox-delivery.md
 */

import { randomUUID } from 'crypto';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { platformOutbox } from '@/lib/db/schema';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { pushPlatformProjectTombstone } from '@/lib/platform-project-upsert';
import { rebuildCollectionProjection } from '@/lib/collection-projection';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import {
  isKnowledgeFacetId,
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  normalizeFacetFreshness,
  toKnowledgePackResponse,
  type FacetFreshness,
  type KnowledgeFacetId,
  type KnowledgePackFacets,
} from '@/lib/collection-knowledge-pack';

export const PLATFORM_OUTBOX_KIND = {
  CAPABILITY_MIRROR_SYNC: 'capability_mirror_sync',
  CAPABILITY_TOMBSTONE: 'capability_tombstone',
  KNOWLEDGE_PUBLISH_RETRY: 'knowledge_publish_retry',
  PROJECTION_REBUILD: 'projection_rebuild',
} as const;

export type PlatformOutboxKind =
  (typeof PLATFORM_OUTBOX_KIND)[keyof typeof PLATFORM_OUTBOX_KIND];

export const PLATFORM_OUTBOX_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  DEAD: 'dead',
} as const;

export type EnqueueOutboxInput = {
  kind: PlatformOutboxKind;
  payload: Record<string, unknown>;
  nextAttemptAt?: Date;
  maxAttempts?: number;
};

function backoffMs(attempts: number): number {
  return Math.min(30 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 10));
}

export async function enqueuePlatformOutbox(input: EnqueueOutboxInput): Promise<string> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date();
  await db.insert(platformOutbox).values({
    id,
    kind: input.kind,
    payload: input.payload,
    status: PLATFORM_OUTBOX_STATUS.PENDING,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 8,
    nextAttemptAt: input.nextAttemptAt ?? now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function enqueueMirrorSyncRetry(input: {
  platformProjectId: string;
  productIds?: PlatformProductId[];
  source?: string;
}): Promise<string> {
  return enqueuePlatformOutbox({
    kind: PLATFORM_OUTBOX_KIND.CAPABILITY_MIRROR_SYNC,
    payload: {
      platformProjectId: input.platformProjectId,
      productIds: input.productIds ?? null,
      source: input.source ?? 'plexon-outbox-mirror-retry',
    },
  });
}

export async function enqueueCapabilityTombstone(input: {
  platformProjectId: string;
  products: Array<{
    productId: PlatformProductId;
    externalProjectId: string | null;
  }>;
  source?: string;
}): Promise<string> {
  return enqueuePlatformOutbox({
    kind: PLATFORM_OUTBOX_KIND.CAPABILITY_TOMBSTONE,
    payload: {
      platformProjectId: input.platformProjectId,
      products: input.products,
      source: input.source ?? 'plexon-outbox-tombstone',
    },
  });
}

export async function enqueueProjectionRebuild(platformProjectId: string): Promise<string> {
  return enqueuePlatformOutbox({
    kind: PLATFORM_OUTBOX_KIND.PROJECTION_REBUILD,
    payload: { platformProjectId },
  });
}

export async function enqueueKnowledgePublishRetry(input: {
  platformProjectId: string;
  facetId: KnowledgeFacetId;
  freshness?: FacetFreshness;
  note?: string;
}): Promise<string> {
  return enqueuePlatformOutbox({
    kind: PLATFORM_OUTBOX_KIND.KNOWLEDGE_PUBLISH_RETRY,
    payload: {
      platformProjectId: input.platformProjectId,
      facetId: input.facetId,
      freshness: input.freshness ?? 'publish_failed',
      note: input.note ?? null,
    },
  });
}

export type DrainOutboxResult = {
  processed: number;
  done: number;
  dead: number;
  remainingPending: number;
};

async function markDone(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(platformOutbox)
    .set({
      status: PLATFORM_OUTBOX_STATUS.DONE,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(platformOutbox.id, id));
}

async function markRetryOrDead(
  row: typeof platformOutbox.$inferSelect,
  error: string
): Promise<'dead' | 'pending'> {
  const db = getDb();
  const attempts = row.attempts + 1;
  if (attempts >= row.maxAttempts) {
    await db
      .update(platformOutbox)
      .set({
        status: PLATFORM_OUTBOX_STATUS.DEAD,
        attempts,
        lastError: error.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(platformOutbox.id, row.id));
    return 'dead';
  }
  await db
    .update(platformOutbox)
    .set({
      status: PLATFORM_OUTBOX_STATUS.PENDING,
      attempts,
      nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
      lastError: error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(platformOutbox.id, row.id));
  return 'pending';
}

async function handleMirrorSync(payload: Record<string, unknown>): Promise<void> {
  const platformProjectId =
    typeof payload.platformProjectId === 'string' ? payload.platformProjectId : '';
  if (!platformProjectId) throw new Error('missing platformProjectId');
  const productIds = Array.isArray(payload.productIds)
    ? (payload.productIds.filter(
        (id): id is PlatformProductId => typeof id === 'string'
      ) as PlatformProductId[])
    : undefined;
  const source =
    typeof payload.source === 'string' ? payload.source : 'plexon-outbox-mirror-retry';
  const results = await syncPlatformProjectToProducts(platformProjectId, {
    source,
    onlyProducts: productIds?.length ? productIds : undefined,
    enqueueOnFailure: false,
  });
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    throw new Error(failed.map((f) => `${f.productId}: ${f.error ?? 'failed'}`).join('; '));
  }
}

async function handleTombstone(payload: Record<string, unknown>): Promise<void> {
  const platformProjectId =
    typeof payload.platformProjectId === 'string' ? payload.platformProjectId : '';
  const products = Array.isArray(payload.products) ? payload.products : [];
  const source =
    typeof payload.source === 'string' ? payload.source : 'plexon-outbox-tombstone';
  const errors: string[] = [];
  for (const item of products) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { productId?: string; externalProjectId?: string | null };
    if (!row.productId) continue;
    const result = await pushPlatformProjectTombstone(
      row.productId as PlatformProductId,
      platformProjectId,
      {
        externalProjectId: row.externalProjectId ?? null,
        source,
        requestedAt: new Date().toISOString(),
      }
    );
    if (!result.ok && result.supported) {
      errors.push(`${row.productId}: ${result.error ?? 'tombstone failed'}`);
    }
  }
  if (errors.length) throw new Error(errors.join('; '));
}

async function handleKnowledgePublishRetry(payload: Record<string, unknown>): Promise<void> {
  const platformProjectId =
    typeof payload.platformProjectId === 'string' ? payload.platformProjectId : '';
  const facetIdRaw = typeof payload.facetId === 'string' ? payload.facetId : '';
  if (!platformProjectId || !isKnowledgeFacetId(facetIdRaw)) {
    throw new Error('invalid knowledge_publish_retry payload');
  }
  const facetId = facetIdRaw as KnowledgeFacetId;
  const freshness = normalizeFacetFreshness(payload.freshness ?? 'publish_failed');
  const current = await getOrCreateKnowledgePack(platformProjectId);
  const pack = toKnowledgePackResponse(current);
  const existing = pack.facets[facetId];
  const at = new Date().toISOString();
  const facetDocument = {
    ...existing,
    facetId,
    schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
    updatedAt: at,
    freshness,
    provenance: {
      ...existing.provenance,
      note:
        typeof payload.note === 'string'
          ? payload.note
          : existing.provenance.note ?? 'outbox knowledge_publish_retry',
    },
  } as KnowledgePackFacets[KnowledgeFacetId];

  const result = await patchKnowledgePackFacet({
    platformProjectId,
    facetId,
    facetDocument,
    expectedRevision: current.revision,
    updatedByUserId: null,
  });
  if (result === 'conflict') {
    throw new Error('revision conflict on knowledge_publish_retry');
  }
}

async function handleProjectionRebuild(payload: Record<string, unknown>): Promise<void> {
  const platformProjectId =
    typeof payload.platformProjectId === 'string' ? payload.platformProjectId : '';
  if (!platformProjectId) throw new Error('missing platformProjectId');
  await rebuildCollectionProjection(platformProjectId);
}

export async function processOutboxRow(
  row: typeof platformOutbox.$inferSelect
): Promise<'done' | 'dead' | 'pending'> {
  try {
    switch (row.kind) {
      case PLATFORM_OUTBOX_KIND.CAPABILITY_MIRROR_SYNC:
        await handleMirrorSync(row.payload);
        break;
      case PLATFORM_OUTBOX_KIND.CAPABILITY_TOMBSTONE:
        await handleTombstone(row.payload);
        break;
      case PLATFORM_OUTBOX_KIND.KNOWLEDGE_PUBLISH_RETRY:
        await handleKnowledgePublishRetry(row.payload);
        break;
      case PLATFORM_OUTBOX_KIND.PROJECTION_REBUILD:
        await handleProjectionRebuild(row.payload);
        break;
      default:
        throw new Error(`unknown outbox kind: ${row.kind}`);
    }
    await markDone(row.id);
    return 'done';
  } catch (e) {
    const message = e instanceof Error ? e.message : 'outbox handler failed';
    return markRetryOrDead(row, message);
  }
}

export async function drainPlatformOutbox(limit = 20): Promise<DrainOutboxResult> {
  const capped = Math.max(1, Math.min(100, Math.floor(limit)));
  const db = getDb();
  const now = new Date();
  const due = await db
    .select()
    .from(platformOutbox)
    .where(
      and(
        eq(platformOutbox.status, PLATFORM_OUTBOX_STATUS.PENDING),
        lte(platformOutbox.nextAttemptAt, now)
      )
    )
    .orderBy(asc(platformOutbox.nextAttemptAt))
    .limit(capped);

  let done = 0;
  let dead = 0;
  let processed = 0;

  for (const row of due) {
    const claimed = await db
      .update(platformOutbox)
      .set({ status: PLATFORM_OUTBOX_STATUS.PROCESSING, updatedAt: new Date() })
      .where(
        and(
          eq(platformOutbox.id, row.id),
          eq(platformOutbox.status, PLATFORM_OUTBOX_STATUS.PENDING)
        )
      )
      .returning();
    if (!claimed.length) continue;
    processed += 1;
    const outcome = await processOutboxRow(claimed[0]!);
    if (outcome === 'done') done += 1;
    if (outcome === 'dead') dead += 1;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(platformOutbox)
    .where(eq(platformOutbox.status, PLATFORM_OUTBOX_STATUS.PENDING));

  return {
    processed,
    done,
    dead,
    remainingPending: Number(count) || 0,
  };
}

export async function getOutboxMetrics(): Promise<{
  pending: number;
  dead: number;
  oldestPendingAt: string | null;
}> {
  const db = getDb();
  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(platformOutbox)
    .where(eq(platformOutbox.status, PLATFORM_OUTBOX_STATUS.PENDING));
  const [deadRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(platformOutbox)
    .where(eq(platformOutbox.status, PLATFORM_OUTBOX_STATUS.DEAD));
  const [oldest] = await db
    .select({ createdAt: platformOutbox.createdAt })
    .from(platformOutbox)
    .where(eq(platformOutbox.status, PLATFORM_OUTBOX_STATUS.PENDING))
    .orderBy(asc(platformOutbox.createdAt))
    .limit(1);
  return {
    pending: Number(pendingRow?.count) || 0,
    dead: Number(deadRow?.count) || 0,
    oldestPendingAt: oldest?.createdAt ? oldest.createdAt.toISOString() : null,
  };
}

export async function snapshotBindingsForTombstone(platformProjectId: string) {
  const bindings = await getBindingsForPlatformProject(platformProjectId);
  return bindings.map((b) => ({
    productId: b.productId as PlatformProductId,
    externalProjectId: b.externalProjectId,
  }));
}

export function __testBackoffMs(attempts: number): number {
  return backoffMs(attempts);
}
