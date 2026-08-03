import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  authorizeKnowledgeRead,
  isServiceSecretAuthorized,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth';
import {
  FacetValidationError,
  KNOWLEDGE_FACET_IDS,
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  assertFacetSize,
  createEmptyFacets,
  ensureFacetsShape,
  normalizeFacetData,
  normalizeProvenance,
  toKnowledgePackResponse,
  type KnowledgeFacetId,
  type KnowledgePackFacets,
} from '@/lib/collection-knowledge-pack';
import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getOrCreateKnowledgePack,
  replaceKnowledgePackFacets,
} from '@/lib/db/collection-knowledge-packs';
import { platformJson } from '@/lib/platform-contract';

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
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    const { platformProjectId } = await ctx.params;
    const id = platformProjectId?.trim();
    if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

    const auth = await authorizeKnowledgeRead(request, id);
    if ('error' in auth) return authError(auth.error);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const row = await getOrCreateKnowledgePack(id);
    return platformJson(toKnowledgePackResponse(row));
  } catch (e) {
    return handleApiError(e, { context: 'knowledge GET' });
  }
}

/** Admin replace entire pack — requires If-Match: revision (or body.expectedRevision). */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    if (isServiceSecretAuthorized(request)) {
      return apiError('Use PATCH/publish for service writers', API_STATUS.FORBIDDEN);
    }

    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { platformProjectId } = await ctx.params;
    const id = platformProjectId?.trim();
    if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    if (!(await userCanEditKnowledgePack(user, id))) {
      return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return apiError('Invalid body', API_STATUS.BAD_REQUEST);
    }

    const ifMatch = request.headers.get('If-Match')?.trim();
    const expectedRevision =
      typeof body.expectedRevision === 'number'
        ? body.expectedRevision
        : ifMatch
          ? Number(ifMatch)
          : NaN;
    if (!Number.isFinite(expectedRevision)) {
      return apiError('expectedRevision or If-Match required', API_STATUS.BAD_REQUEST);
    }

    const at = new Date().toISOString();
    const base = createEmptyFacets(at);
    const incomingFacets =
      body.facets && typeof body.facets === 'object'
        ? (body.facets as Record<string, unknown>)
        : {};

    const facets = { ...base } as KnowledgePackFacets;
    for (const facetId of KNOWLEDGE_FACET_IDS) {
      const incoming = incomingFacets[facetId];
      if (!incoming || typeof incoming !== 'object') continue;
      const doc = incoming as Record<string, unknown>;
      if (facetId === 'brand') {
        // Keep reserved — ignore client brand payload
        continue;
      }
      const data = normalizeFacetData(facetId, doc.data ?? doc);
      assertFacetSize(facetId, data);
      facets[facetId] = {
        facetId,
        schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
        updatedAt: at,
        provenance: normalizeProvenance(doc.provenance, {
          actorType: 'user',
          actorUserId: user.id,
          productId: 'plexon',
          note: 'admin replace',
        }),
        data: data as never,
      } as KnowledgePackFacets[typeof facetId];
    }

    const result = await replaceKnowledgePackFacets({
      platformProjectId: id,
      facets: ensureFacetsShape(facets, at),
      expectedRevision,
      updatedByUserId: user.id,
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
    return handleApiError(e, { context: 'knowledge PUT' });
  }
}
