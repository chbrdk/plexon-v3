import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import {
  FacetValidationError,
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  assertFacetSize,
  isKnowledgeFacetId,
  mergeFacetData,
  normalizeFacetData,
  normalizeProvenance,
  productMayPublishFacet,
  toKnowledgePackResponse,
  type KnowledgeFacetId,
  type KnowledgePackFacets,
  type KnowledgeProductId,
} from '@/lib/collection-knowledge-pack';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import { platformJson } from '@/lib/platform-contract';

/**
 * Service-only product publish helper — validates facet ownership via provenance.productId.
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
    if (facetId === 'brand') {
      return apiError('Brand facet is reserved until Brandion federates', API_STATUS.UNPROCESSABLE);
    }

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return apiError('Invalid body', API_STATUS.BAD_REQUEST);
    }

    const provenance = body.provenance;
    const productId =
      provenance && typeof provenance === 'object'
        ? (provenance as { productId?: string }).productId
        : undefined;
    if (!productMayPublishFacet(facetId, productId as KnowledgeProductId | undefined)) {
      return apiError('Product may not publish this facet', API_STATUS.FORBIDDEN);
    }

    const mode = body.mode === 'merge' ? 'merge' : 'replace';
    const expectedRevision =
      typeof body.expectedRevision === 'number' ? body.expectedRevision : NaN;
    if (!Number.isFinite(expectedRevision)) {
      return apiError('expectedRevision required', API_STATUS.BAD_REQUEST);
    }

    const current = await getOrCreateKnowledgePack(id);
    const pack = toKnowledgePackResponse(current);
    const existing = pack.facets[facetId];
    const mergedData =
      mode === 'merge'
        ? mergeFacetData(facetId, existing.data, body.data ?? {})
        : normalizeFacetData(facetId, body.data ?? {});

    assertFacetSize(facetId, mergedData);

    const at = new Date().toISOString();
    const facetDocument = {
      facetId,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: at,
      provenance: normalizeProvenance(provenance, {
        actorType: 'service',
        productId: productId as KnowledgeProductId,
      }),
      data: mergedData as never,
    } as KnowledgePackFacets[KnowledgeFacetId];

    const result = await patchKnowledgePackFacet({
      platformProjectId: id,
      facetId,
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
    return handleApiError(e, { context: 'knowledge facet publish' });
  }
}
