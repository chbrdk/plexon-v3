import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import {
  getCollectionProjection,
  rebuildCollectionProjection,
} from '@/lib/collection-projection';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { platformJson } from '@/lib/platform-contract';

async function authorize(
  request: Request,
  platformProjectId: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (isServiceSecretAuthorized(request)) {
    if (!hasValidContractHeader(request)) {
      return {
        ok: false,
        response: apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST),
      };
    }
    return { ok: true };
  }
  const user = await getRequestUser(request);
  if (!user) {
    return { ok: false, response: apiError('Unauthorized', API_STATUS.UNAUTHORIZED) };
  }
  const allowed = await userCanViewPlatformProject(user.id, user.role, platformProjectId);
  if (!allowed) {
    return { ok: false, response: apiError('Forbidden', API_STATUS.FORBIDDEN) };
  }
  return { ok: true };
}

/**
 * Collection read model snapshot (Wave B).
 * Spec: specs/domain/collection-read-model.md
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    const { platformProjectId } = await ctx.params;
    const id = platformProjectId?.trim();
    if (!id) return apiError('Invalid path', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const projection = await getCollectionProjection(id, { rebuildIfMissing: true });
    if (!projection) return apiError('Not found', API_STATUS.NOT_FOUND);
    return platformJson(projection);
  } catch (e) {
    return handleApiError(e, { context: 'collection projection get' });
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    const { platformProjectId } = await ctx.params;
    const id = platformProjectId?.trim();
    if (!id) return apiError('Invalid path', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const snapshot = await rebuildCollectionProjection(id);
    if (!snapshot) return apiError('Not found', API_STATUS.NOT_FOUND);
    const projection = await getCollectionProjection(id, { rebuildIfMissing: false });
    return platformJson(projection ?? { platformProjectId: id, revision: 1, snapshot });
  } catch (e) {
    return handleApiError(e, { context: 'collection projection rebuild' });
  }
}
