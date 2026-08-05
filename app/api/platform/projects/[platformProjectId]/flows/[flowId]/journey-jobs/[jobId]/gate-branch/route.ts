/**
 * Live-Gate branch during an active journey job (Wave 6).
 * Proxies to Audion `POST …/ux-journey-agent/run/{jobId}/gate-branch`.
 */
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { postJourneyGateBranch } from '@/lib/integrations/audion-journey-client';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string; jobId: string }> }
) {
  try {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { platformProjectId, jobId } = await ctx.params;
    const id = platformProjectId?.trim();
    const jid = jobId?.trim();
    if (!id || !jid) return apiError('Invalid id', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    if (!(await userCanEditKnowledgePack(user, id))) {
      return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const gateNodeId = typeof body.gateNodeId === 'string' ? body.gateNodeId.trim() : '';
    const edgeKind = body.edgeKind === 'otherwise' ? 'otherwise' : body.edgeKind === 'when' ? 'when' : null;
    if (!gateNodeId || !edgeKind) {
      return apiError('gateNodeId and edgeKind (when|otherwise) required', API_STATUS.BAD_REQUEST);
    }

    const result = await postJourneyGateBranch({ jobId: jid, gateNodeId, edgeKind });
    if (!result.ok) return apiError(result.error, 502);
    return platformJson({ ok: true, flowCursor: result.flowCursor ?? null });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow gate-branch POST' });
  }
}
