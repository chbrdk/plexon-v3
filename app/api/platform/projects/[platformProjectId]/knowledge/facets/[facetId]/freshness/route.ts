/**
 * Mark Knowledge Pack facet freshness without changing facet data.
 * Spec: platform-outbox-delivery.md · soft-skip visibility
 */

import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import {
  FacetValidationError,
  isKnowledgeFacetId,
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  normalizeFacetFreshness,
  toKnowledgePackResponse,
  type FacetFreshness,
  type KnowledgeFacetId,
  type KnowledgePackFacets,
} from '@/lib/collection-knowledge-pack';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import { platformJson } from '@/lib/platform-contract';

const ALLOWED: FacetFreshness[] = [
  'fresh',
  'publish_pending',
  'publish_failed',
  'stale',
];

/**
 * Service-only: PATCH freshness on a facet (soft-skip / drift signal).
 * Body: `{ freshness, note?, expectedRevision? }`
 * When expectedRevision omitted, uses current revision (last-write-wins for freshness).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; facetId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    if (!isServiceSecretAuthorized(request)) {
      return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (!hasValidContractHeader(request)) {
      return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
    }

    const { platformProjectId, facetId: rawFacet } = await ctx.params;
    const id = platformProjectId?.trim();
    const facetId = rawFacet?.trim();
    if (!id || !facetId) return apiError('Invalid path', API_STATUS.BAD_REQUEST);
    if (!isKnowledgeFacetId(facetId)) {
      return apiError('Unknown facet', API_STATUS.UNPROCESSABLE);
    }

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return apiError('Invalid body', API_STATUS.BAD_REQUEST);
    }

    const freshness = normalizeFacetFreshness(body.freshness);
    if (!ALLOWED.includes(freshness) || body.freshness == null) {
      return apiError('freshness required', API_STATUS.BAD_REQUEST);
    }

    const current = await getOrCreateKnowledgePack(id);
    const pack = toKnowledgePackResponse(current);
    const expectedRevision =
      typeof body.expectedRevision === 'number' && Number.isFinite(body.expectedRevision)
        ? body.expectedRevision
        : current.revision;

    const existing = pack.facets[facetId as KnowledgeFacetId];
    const at = new Date().toISOString();
    const note =
      typeof body.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : existing.provenance.note ?? 'freshness mark';

    const facetDocument = {
      ...existing,
      facetId,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: at,
      freshness,
      provenance: {
        ...existing.provenance,
        actorType: 'service' as const,
        note,
      },
    } as KnowledgePackFacets[KnowledgeFacetId];

    const result = await patchKnowledgePackFacet({
      platformProjectId: id,
      facetId: facetId as KnowledgeFacetId,
      facetDocument,
      expectedRevision,
      updatedByUserId: null,
    });
    if (result === 'conflict') {
      return apiError('Revision conflict', API_STATUS.CONFLICT);
    }
    if (!result) return apiError('Not found', API_STATUS.NOT_FOUND);
    return platformJson(toKnowledgePackResponse(result));
  } catch (e) {
    if (e instanceof FacetValidationError) {
      return apiError(e.message, e.status);
    }
    return handleApiError(e, { context: 'knowledge facet freshness' });
  }
}
