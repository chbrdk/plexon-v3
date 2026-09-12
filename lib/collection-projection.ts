/**
 * Collection read model — Wave B.
 * Spec: specs/domain/collection-read-model.md
 */

import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { collectionKnowledgePacks, collectionProjections } from '@/lib/db/schema';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import {
  getOrCreateKnowledgePack,
} from '@/lib/db/collection-knowledge-packs';
import {
  buildKnowledgeFacetReadiness,
  facetPreview,
  normalizeBrandData,
  normalizeFacetFreshness,
  toKnowledgePackResponse,
  type FacetFreshness,
  type KnowledgeFacetId,
} from '@/lib/collection-knowledge-pack';

export type CollectionProjectionTeaser = {
  facetId: KnowledgeFacetId;
  preview: string;
  readiness: 'filled' | 'empty' | 'reserved';
  freshness: FacetFreshness;
  updatedAt: string;
};

export type CollectionProjectionSnapshot = {
  identity: {
    id: string;
    name: string;
    domain: string | null;
    status: string;
    companyId: string;
  };
  bindings: Array<{
    productId: string;
    syncStatus: string;
    externalProjectId: string | null;
    syncMessage: string | null;
  }>;
  knowledgeTeasers: CollectionProjectionTeaser[];
  capabilityCards: Array<{
    productId: string;
    label: string;
    summaryLine: string | null;
    stale: boolean;
  }>;
  brand: {
    status: 'reserved' | 'active';
    guidelineRef: { guidelineId: string; version: string; url?: string } | null;
    voiceSummary: string | null;
  };
  builtAt: string;
};

const PRODUCT_LABELS: Record<string, string> = {
  checkion: 'CHECKION',
  audion: 'AUDION',
  brandion: 'BRANDION',
  creation: 'CREATION',
  spirion: 'SPIRION',
  videon: 'VIDEON',
  echon: 'ECHON',
};

export function buildCollectionProjectionSnapshot(input: {
  project: {
    id: string;
    name: string;
    domain: string | null;
    status: string;
    companyId: string;
  };
  bindings: Array<{
    productId: string;
    syncStatus: string;
    externalProjectId: string | null;
    syncMessage: string | null;
  }>;
  pack: ReturnType<typeof toKnowledgePackResponse>;
  builtAt?: string;
}): CollectionProjectionSnapshot {
  const readiness = buildKnowledgeFacetReadiness(input.pack.facets);
  const knowledgeTeasers: CollectionProjectionTeaser[] = readiness.map((r) => {
    const facet = input.pack.facets[r.facetId];
    return {
      facetId: r.facetId,
      preview: facetPreview(r.facetId, facet.data),
      readiness: r.status,
      freshness: normalizeFacetFreshness(facet.freshness),
      updatedAt: facet.updatedAt,
    };
  });

  const brandData = normalizeBrandData(input.pack.facets.brand.data);
  const capabilityCards = input.bindings.map((b) => ({
    productId: b.productId,
    label: PRODUCT_LABELS[b.productId] ?? b.productId.toUpperCase(),
    summaryLine:
      b.syncStatus === 'in_sync'
        ? b.externalProjectId
          ? `Linked · ${b.externalProjectId.slice(0, 8)}…`
          : 'Linked'
        : b.syncMessage || b.syncStatus,
    stale: b.syncStatus !== 'in_sync',
  }));

  return {
    identity: {
      id: input.project.id,
      name: input.project.name,
      domain: input.project.domain,
      status: input.project.status,
      companyId: input.project.companyId,
    },
    bindings: input.bindings.map((b) => ({
      productId: b.productId,
      syncStatus: b.syncStatus,
      externalProjectId: b.externalProjectId,
      syncMessage: b.syncMessage,
    })),
    knowledgeTeasers,
    capabilityCards,
    brand: {
      status: brandData.status,
      guidelineRef: brandData.guidelineRef
        ? {
            guidelineId: brandData.guidelineRef.guidelineId,
            version: brandData.guidelineRef.version,
            url: brandData.guidelineRef.url,
          }
        : null,
      voiceSummary: brandData.voiceSummary,
    },
    builtAt: input.builtAt ?? new Date().toISOString(),
  };
}

export async function rebuildCollectionProjection(
  platformProjectId: string
): Promise<CollectionProjectionSnapshot | null> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return null;

  const [bindings, packRow] = await Promise.all([
    getBindingsForPlatformProject(platformProjectId),
    getOrCreateKnowledgePack(platformProjectId),
  ]);
  const pack = toKnowledgePackResponse(packRow);
  const snapshot = buildCollectionProjectionSnapshot({
    project: {
      id: project.id,
      name: project.name,
      domain: project.domain ?? null,
      status: project.status,
      companyId: project.companyId,
    },
    bindings: bindings.map((b) => ({
      productId: b.productId,
      syncStatus: b.syncStatus,
      externalProjectId: b.externalProjectId,
      syncMessage: b.syncMessage,
    })),
    pack,
  });

  const db = getDb();
  const now = new Date();
  const existing = await db
    .select()
    .from(collectionProjections)
    .where(eq(collectionProjections.platformProjectId, platformProjectId))
    .limit(1);
  const nextRevision = (existing[0]?.revision ?? 0) + 1;

  await db
    .insert(collectionProjections)
    .values({
      platformProjectId,
      revision: nextRevision,
      snapshot,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: collectionProjections.platformProjectId,
      set: {
        revision: nextRevision,
        snapshot,
        updatedAt: now,
      },
    });

  return snapshot;
}

export async function getCollectionProjection(
  platformProjectId: string,
  options: { rebuildIfMissing?: boolean } = {}
): Promise<{
  platformProjectId: string;
  revision: number;
  updatedAt: string;
  snapshot: CollectionProjectionSnapshot;
} | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionProjections)
    .where(eq(collectionProjections.platformProjectId, platformProjectId))
    .limit(1);

  if (!row) {
    if (options.rebuildIfMissing === false) return null;
    const snapshot = await rebuildCollectionProjection(platformProjectId);
    if (!snapshot) return null;
    const [created] = await db
      .select()
      .from(collectionProjections)
      .where(eq(collectionProjections.platformProjectId, platformProjectId))
      .limit(1);
    if (!created) return null;
    return {
      platformProjectId,
      revision: created.revision,
      updatedAt: created.updatedAt.toISOString(),
      snapshot: created.snapshot as CollectionProjectionSnapshot,
    };
  }

  return {
    platformProjectId,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
    snapshot: row.snapshot as CollectionProjectionSnapshot,
  };
}

export async function countCollectionProjections(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionProjections);
  return Number(row?.count) || 0;
}

export async function countStaleOrFailedFacets(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ facets: collectionKnowledgePacks.facets })
    .from(collectionKnowledgePacks)
    .limit(500);
  let count = 0;
  for (const row of rows) {
    if (!row.facets || typeof row.facets !== 'object') continue;
    for (const value of Object.values(row.facets as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const freshness = (value as { freshness?: unknown }).freshness;
      if (
        freshness === 'stale' ||
        freshness === 'publish_failed' ||
        freshness === 'publish_pending'
      ) {
        count += 1;
      }
    }
  }
  return count;
}
