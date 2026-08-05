import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  authorizeKnowledgeRead,
  isServiceSecretAuthorized,
  hasValidContractHeader,
} from '@/lib/collection-knowledge-pack-auth';
import {
  readWebhookSecretFromRequest,
  verifyWebhookSecret,
} from '@/lib/collection-flow-webhook';
import { getCollectionFlowRun, toCollectionFlowRunResponse } from '@/lib/db/collection-flow-runs';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

function authError(code: 'unauthorized' | 'forbidden' | 'contract'): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN);
}

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string; runId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

    const { platformProjectId, flowId, runId } = await ctx.params;
    const id = platformProjectId?.trim();
    const fid = flowId?.trim();
    const rid = runId?.trim();
    if (!id || !fid || !rid) return apiError('Invalid id', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const flow = await getCollectionTestFlow(id, fid);
    if (!flow) return apiError('Not found', API_STATUS.NOT_FOUND);

    let authorized = false;
    const webhookSecret = readWebhookSecretFromRequest(request);
    if (webhookSecret && verifyWebhookSecret(webhookSecret, flow.webhookSecretHash)) {
      authorized = true;
    } else if (isServiceSecretAuthorized(request)) {
      if (!hasValidContractHeader(request)) return authError('contract');
      authorized = true;
    } else {
      const auth = await authorizeKnowledgeRead(request, id);
      if ('error' in auth) return authError(auth.error);
      authorized = true;
    }

    if (!authorized) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const run = await getCollectionFlowRun(id, fid, rid);
    if (!run) return apiError('Not found', API_STATUS.NOT_FOUND);

    return platformJson(toCollectionFlowRunResponse(run));
  } catch (e) {
    return handleApiError(e, { context: 'collection flow run GET' });
  }
}
