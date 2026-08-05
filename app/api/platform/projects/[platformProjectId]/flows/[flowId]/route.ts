import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  authorizeKnowledgeRead,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  ensureFlowDocument,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import {
  getCollectionTestFlow,
  patchCollectionTestFlow,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

function authError(code: 'unauthorized' | 'forbidden' | 'contract'): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN);
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    const { platformProjectId, flowId } = await ctx.params;
    const id = platformProjectId?.trim();
    const fid = flowId?.trim();
    if (!id || !fid) return apiError('Invalid id', API_STATUS.BAD_REQUEST);

    const auth = await authorizeKnowledgeRead(request, id);
    if ('error' in auth) return authError(auth.error);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const row = await getCollectionTestFlow(id, fid);
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);

    return platformJson(toCollectionTestFlowResponse(row));
  } catch (e) {
    return handleApiError(e, { context: 'collection flow GET' });
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { platformProjectId, flowId } = await ctx.params;
    const id = platformProjectId?.trim();
    const fid = flowId?.trim();
    if (!id || !fid) return apiError('Invalid id', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    if (!(await userCanEditKnowledgePack(user, id))) {
      return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return apiError('Invalid body', API_STATUS.BAD_REQUEST);
    }

    let nextFlow: CollectionTestFlowDocument | undefined;
    if (body.flow != null) {
      nextFlow = ensureFlowDocument(body.flow);
    }

    const name = typeof body.name === 'string' ? body.name : undefined;
    const row = await patchCollectionTestFlow({
      platformProjectId: id,
      flowId: fid,
      name,
      flow: nextFlow,
    });
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);

    return platformJson(toCollectionTestFlowResponse(row));
  } catch (e) {
    return handleApiError(e, { context: 'collection flow PATCH' });
  }
}
