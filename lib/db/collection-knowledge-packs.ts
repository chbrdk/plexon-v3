import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { collectionKnowledgePacks } from './schema';
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
    // Race: another request created the row
    const raced = await getKnowledgePackByPlatformProjectId(platformProjectId);
    if (raced) return raced;
    throw new Error('Failed to create knowledge pack');
  }
  const created = await getKnowledgePackByPlatformProjectId(platformProjectId);
  if (!created) throw new Error('Failed to load knowledge pack after create');
  return created;
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
  facets[input.facetId] = input.facetDocument as never;

  const db = getDb();
  const now = new Date();
  await db
    .update(collectionKnowledgePacks)
    .set({
      facets,
      revision: current.revision + 1,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId ?? null,
    })
    .where(eq(collectionKnowledgePacks.id, current.id));

  return getKnowledgePackByPlatformProjectId(input.platformProjectId);
}
