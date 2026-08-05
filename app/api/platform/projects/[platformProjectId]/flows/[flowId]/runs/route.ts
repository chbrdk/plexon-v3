import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { authorizeKnowledgeRead } from '@/lib/collection-knowledge-pack-auth';
import {
  listRecentCollectionFlowRuns,
  toCollectionFlowRunResponse,
} from '@/lib/db/collection-flow-runs';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function authError(code: 'unauthorized' | 'forbidden' | 'contract'): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN);
}

/**
 * Wave 17: list Collection Flow runs (newest first).
 * GET …/flows/:flowId/runs?limit=
 */
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

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const flow = await getCollectionTestFlow(id, fid);
    if (!flow) return apiError('Not found', API_STATUS.NOT_FOUND);

    const auth = await authorizeKnowledgeRead(request, id);
    if ('error' in auth) return authError(auth.error);

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit)))
      : DEFAULT_LIMIT;

    const rows = await listRecentCollectionFlowRuns(id, fid, limit);
    return platformJson({
      items: rows.map(toCollectionFlowRunResponse),
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow runs list GET' });
  }
}
