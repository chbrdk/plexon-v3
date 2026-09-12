import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { collectionKnowledgePackEvents, collectionKnowledgePacks } from './schema';
import {
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  createEmptyFacets,
  ensureFacetsShape,
  type KnowledgePackFacets,
} from '@/lib/collection-knowledge-pack';

export type CollectionKnowledgePackRow = typeof collectionKnowledgePacks.$inferSelect;

export async function getKnowledgePackByPlatformProjectId(
  platformProjectId: string
): Promise<CollectionKnowledgePackRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionKnowledgePacks)
    .where(eq(collectionKnowledgePacks.platformProjectId, platformProjectId))
    .limit(1);
  return row ?? null;
}

/** Lazy-create empty pack on first GET. */
export async function getOrCreateKnowledgePack(
  platformProjectId: string
): Promise<CollectionKnowledgePackRow> {
  const existing = await getKnowledgePackByPlatformProjectId(platformProjectId);
  if (existing) return existing;

  const db = getDb();
  const now = new Date();
  const facets = createEmptyFacets(now.toISOString());
  const id = randomUUID();
  try {
    await db.insert(collectionKnowledgePacks).values({
      id,
      platformProjectId,
      revision: 1,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      facets,
      updatedAt: now,
      updatedByUserId: null,
    });
  } catch {
    const raced = await getKnowledgePackByPlatformProjectId(platformProjectId);
    if (raced) return raced;
    throw new Error('Failed to create knowledge pack');
  }
  const created = await getKnowledgePackByPlatformProjectId(platformProjectId);
  if (!created) throw new Error('Failed to load knowledge pack after create');
  return created;
}

async function appendPackEvent(input: {
  packId: string;
  facetId: string;
  revision: number;
  actorType: string;
  actorUserId?: string | null;
  productId?: string | null;
  runId?: string | null;
  sourceUri?: string | null;
  patchSummary?: string | null;
}): Promise<void> {
  const db = getDb();
  await db.insert(collectionKnowledgePackEvents).values({
    id: randomUUID(),
    packId: input.packId,
    facetId: input.facetId,
    revision: input.revision,
    actorType: input.actorType,
    actorUserId: input.actorUserId ?? null,
    productId: input.productId ?? null,
    runId: input.runId ?? null,
    sourceUri: input.sourceUri ?? null,
    patchSummary: input.patchSummary ?? null,
    createdAt: new Date(),
  });
}

async function rebuildProjectionBestEffort(platformProjectId: string): Promise<void> {
  try {
    const { rebuildCollectionProjection } = await import('@/lib/collection-projection');
    await rebuildCollectionProjection(platformProjectId);
  } catch {
    // best-effort
  }
}

export async function replaceKnowledgePackFacets(input: {
  platformProjectId: string;
  facets: KnowledgePackFacets;
  expectedRevision: number;
  updatedByUserId?: string | null;
}): Promise<CollectionKnowledgePackRow | 'conflict' | null> {
  const current = await getOrCreateKnowledgePack(input.platformProjectId);
  if (current.revision !== input.expectedRevision) return 'conflict';

  const db = getDb();
  const now = new Date();
  const nextRevision = current.revision + 1;
  await db
    .update(collectionKnowledgePacks)
    .set({
      facets: input.facets,
      revision: nextRevision,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId ?? null,
    })
    .where(eq(collectionKnowledgePacks.id, current.id));

  await appendPackEvent({
    packId: current.id,
    facetId: '*',
    revision: nextRevision,
    actorType: input.updatedByUserId ? 'user' : 'system',
    actorUserId: input.updatedByUserId ?? null,
    patchSummary: 'replaceFacets',
  });
  await rebuildProjectionBestEffort(input.platformProjectId);

  return getKnowledgePackByPlatformProjectId(input.platformProjectId);
}

export async function patchKnowledgePackFacet(input: {
  platformProjectId: string;
  facetId: keyof KnowledgePackFacets;
  facetDocument: KnowledgePackFacets[keyof KnowledgePackFacets];
  expectedRevision: number;
  updatedByUserId?: string | null;
}): Promise<CollectionKnowledgePackRow | 'conflict' | null> {
  const current = await getOrCreateKnowledgePack(input.platformProjectId);
  if (current.revision !== input.expectedRevision) return 'conflict';

  const facets = ensureFacetsShape(current.facets, new Date().toISOString());
  const withFreshness = {
    ...input.facetDocument,
    freshness: input.facetDocument.freshness ?? 'fresh',
  } as KnowledgePackFacets[keyof KnowledgePackFacets];
  facets[input.facetId] = withFreshness as never;

  const db = getDb();
  const now = new Date();
  const nextRevision = current.revision + 1;
  await db
    .update(collectionKnowledgePacks)
    .set({
      facets,
      revision: nextRevision,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId ?? null,
    })
    .where(eq(collectionKnowledgePacks.id, current.id));

  const provenance = withFreshness.provenance;
  await appendPackEvent({
    packId: current.id,
    facetId: String(input.facetId),
    revision: nextRevision,
    actorType: provenance?.actorType ?? (input.updatedByUserId ? 'user' : 'system'),
    actorUserId: provenance?.actorUserId ?? input.updatedByUserId ?? null,
    productId: provenance?.productId ?? null,
    runId: provenance?.runId ?? null,
    sourceUri: provenance?.sourceUri ?? null,
    patchSummary: provenance?.note ?? `patch:${String(input.facetId)}`,
  });
  await rebuildProjectionBestEffort(input.platformProjectId);

  return getKnowledgePackByPlatformProjectId(input.platformProjectId);
}
