/**
 * Read-only Soft-Q / Evaluate summary from Audion wave (Wave 7).
 */
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { fetchStudyWave } from '@/lib/integrations/audion-journey-client';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> }
) {
  try {
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

    const row = await getCollectionTestFlow(id, fid);
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);

    const lastRun = (row.flow as { lastRun?: { audionStudyId?: string; audionWaveId?: string } })
      ?.lastRun;
    const url = new URL(request.url);
    const studyId =
      url.searchParams.get('studyId')?.trim() || lastRun?.audionStudyId?.trim() || '';
    const waveId =
      url.searchParams.get('waveId')?.trim() || lastRun?.audionWaveId?.trim() || '';
    if (!studyId || !waveId) {
      return apiError('studyId/waveId missing — run a journey first', API_STATUS.BAD_REQUEST);
    }

    const wave = await fetchStudyWave({ studyId, waveId });
    if (!wave.ok) return apiError(wave.error, 502);

    const softScores = wave.wave.evaluation?.softScores ?? {};
    const notes = wave.wave.evaluation?.notes ?? [];
    const scoreKeys = Object.keys(softScores);
    return platformJson({
      studyId,
      waveId,
      waveKey: wave.wave.waveKey,
      softScoreKeys: scoreKeys,
      softScores,
      notes: notes.slice(0, 12),
      hasCollectionRollup: notes.some((n) => n.includes('Collection Test Flow')),
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow wave-summary GET' });
  }
}
