import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { ensureFlowDocument } from '@/lib/collection-test-flow';
import { enqueueCollectionFlowRun } from '@/lib/collection-flow-run-worker';
import {
  parseClosedFlowTriggerBody,
  readWebhookSecretFromRequest,
  verifyWebhookSecret,
} from '@/lib/collection-flow-webhook';
import {
  apiPlatformProjectFlowRunStatus,
} from '@/lib/constants';
import { createCollectionFlowRun, toCollectionFlowRunResponse } from '@/lib/db/collection-flow-runs';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(
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

    const row = await getCollectionTestFlow(id, fid);
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);

    if (!row.webhookEnabled) {
      return apiError('Webhook disabled for this flow', API_STATUS.FORBIDDEN);
    }

    const secret = readWebhookSecretFromRequest(request);
    if (!secret || !verifyWebhookSecret(secret, row.webhookSecretHash)) {
      return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    // Validate graph shape early via ensure (closed body only for overrides).
    ensureFlowDocument(row.flow);
    const raw = await request.json().catch(() => ({}));
    const closed = parseClosedFlowTriggerBody(raw);
    const requestPayload: Record<string, unknown> = {};
    if (closed.url) requestPayload.url = closed.url;
    if (closed.companyName) requestPayload.companyName = closed.companyName;

    const run = await createCollectionFlowRun({
      flowId: fid,
      platformProjectId: id,
      trigger: 'webhook',
      request: requestPayload,
      callbackUrl: closed.callbackUrl ?? null,
    });

    enqueueCollectionFlowRun({
      platformProjectId: id,
      flowId: fid,
      runId: run.id,
    });

    const statusUrl = apiPlatformProjectFlowRunStatus(id, fid, run.id);
    return platformJson(
      {
        runId: run.id,
        status: run.status,
        statusUrl,
        run: toCollectionFlowRunResponse(run),
      },
      { status: 202 }
    );
  } catch (e) {
    return handleApiError(e, { context: 'collection flow webhook trigger' });
  }
}
