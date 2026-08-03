import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  authorizeKnowledgeRead,
  isServiceSecretAuthorized,
  userCanEditKnowledgePack,
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
import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import { platformJson } from '@/lib/platform-contract';
import { hasValidContractHeader } from '@/lib/collection-knowledge-pack-auth';

function authError(
  code: 'unauthorized' | 'forbidden' | 'contract'
): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN);
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; facetId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    const { platformProjectId, facetId: rawFacet } = await ctx.params;
    const id = platformProjectId?.trim();
    const facetId = rawFacet?.trim();
    if (!id || !facetId) return apiError('Invalid path', API_STATUS.BAD_REQUEST);
    if (!isKnowledgeFacetId(facetId)) {
      return apiError('Unknown facet', API_STATUS.UNPROCESSABLE);
    }

    const auth = await authorizeKnowledgeRead(request, id);
    if ('error' in auth) return authError(auth.error);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const row = await getOrCreateKnowledgePack(id);
    const pack = toKnowledgePackResponse(row);
    return platformJson({
      platformProjectId: id,
      revision: pack.revision,
      facet: pack.facets[facetId],
    });
  } catch (e) {
    return handleApiError(e, { context: 'knowledge facet GET' });
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; facetId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
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

    const service = isServiceSecretAuthorized(request);
    let updatedByUserId: string | null = null;
    let defaultProduct: KnowledgeProductId = 'plexon';

    if (service) {
      if (!hasValidContractHeader(request)) {
        return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
      }
    } else {
      const user = await getRequestUser(request);
      if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
      if (!(await userCanEditKnowledgePack(user, id))) {
        return apiError('Forbidden', API_STATUS.FORBIDDEN);
      }
      updatedByUserId = user.id;
    }

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return apiError('Invalid body', API_STATUS.BAD_REQUEST);
    }

    const mode = body.mode === 'merge' ? 'merge' : 'replace';
    const expectedRevision =
      typeof body.expectedRevision === 'number' ? body.expectedRevision : NaN;
    if (!Number.isFinite(expectedRevision)) {
      return apiError('expectedRevision required', API_STATUS.BAD_REQUEST);
    }

    const provenanceIn = body.provenance;
    if (service) {
      const productId =
        provenanceIn &&
        typeof provenanceIn === 'object' &&
        (provenanceIn as { productId?: string }).productId;
      if (
        !productMayPublishFacet(
          facetId,
          productId as KnowledgeProductId | undefined
        )
      ) {
        return apiError('Product may not write this facet', API_STATUS.FORBIDDEN);
      }
      defaultProduct = (productId as KnowledgeProductId) ?? 'checkion';
    }

    const current = await getOrCreateKnowledgePack(id);
    const pack = toKnowledgePackResponse(current);
    const existing = pack.facets[facetId];
    const incomingData = body.data ?? {};

    const mergedData =
      mode === 'merge'
        ? mergeFacetData(facetId, existing.data, incomingData)
        : normalizeFacetData(facetId, incomingData);

    assertFacetSize(facetId, mergedData);

    const at = new Date().toISOString();
    const facetDocument = {
      facetId,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: at,
      provenance: normalizeProvenance(provenanceIn, {
        actorType: service ? 'service' : 'user',
        actorUserId: updatedByUserId,
        productId: defaultProduct,
      }),
      data: mergedData as never,
    } as KnowledgePackFacets[KnowledgeFacetId];

    const result = await patchKnowledgePackFacet({
      platformProjectId: id,
      facetId,
      facetDocument,
      expectedRevision,
      updatedByUserId,
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
    return handleApiError(e, { context: 'knowledge facet PATCH' });
  }
}
