import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import { issueWebhookSecret } from '@/lib/collection-flow-webhook';
import { patchFlowWebhookSettings } from '@/lib/db/collection-flow-runs';
import { getCollectionTestFlow, toCollectionTestFlowResponse } from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';

export async function POST(
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

    const current = await getCollectionTestFlow(id, fid);
    if (!current) return apiError('Not found', API_STATUS.NOT_FOUND);

    const issued = issueWebhookSecret();
    const row = await patchFlowWebhookSettings({
      platformProjectId: id,
      flowId: fid,
      webhookEnabled: true,
      webhookSecretHash: issued.hash,
      webhookSecretHint: issued.hint,
    });
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);

    return platformJson({
      flow: toCollectionTestFlowResponse(row),
      webhookSecret: issued.secret,
      hint: issued.hint,
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow webhook rotate' });
  }
}
