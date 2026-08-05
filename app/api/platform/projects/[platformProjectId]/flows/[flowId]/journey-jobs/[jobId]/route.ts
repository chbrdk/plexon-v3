/**
 * Proxy a live Audion journey job (Wave 6) — polled by the board every ~2s while Testen runs.
 * Same edit ACL as `run` / `run/journey` (board is an authoring surface, not a public viewer).
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
 */
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { fetchJourneyJob } from '@/lib/integrations/audion-journey-client';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';

export async function GET(
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

    const job = await fetchJourneyJob(jid);
    if (!job.ok) return apiError(job.error, 502);

    return platformJson(job.job);
  } catch (e) {
    return handleApiError(e, { context: 'collection flow journey-jobs GET' });
  }
}
