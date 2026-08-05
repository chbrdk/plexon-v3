/**
 * Start-only Audion journey segment for the live board (Wave 6).
 * Creates + starts a Study/Wave from the embedded journey subgraph and returns immediately —
 * the board polls `GET …/journey-jobs/:jobId` client-side to paint node states.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
 */
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  documentHasJourneySegment,
  ensureFlowDocument,
  resolveJourneyFlowForRun,
  scanNodeUrl,
  startNodeUrl,
} from '@/lib/collection-test-flow';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { startAudionJourneySegment } from '@/lib/integrations/audion-journey-client';
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

    const row = await getCollectionTestFlow(id, fid);
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);

    const doc = ensureFlowDocument(row.flow);
    if (!documentHasJourneySegment(doc)) {
      return apiError('Flow has no journey segment', API_STATUS.BAD_REQUEST);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const urlOverride =
      typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null;
    const baseUrl = urlOverride ?? startNodeUrl(doc.nodes) ?? scanNodeUrl(doc.nodes);
    if (!baseUrl) {
      return apiError('Start URL missing — set start node urlKey or pass url', API_STATUS.BAD_REQUEST);
    }

    const audionProjectId = await getExternalProjectId(id, 'audion');
    if (!audionProjectId) {
      return apiError(
        'AUDION binding missing — bind an Audion project on this Collection',
        API_STATUS.BAD_REQUEST
      );
    }

    const journeyFlow = resolveJourneyFlowForRun(doc, baseUrl);
    if (!journeyFlow) {
      return apiError('Journey flow missing on document', API_STATUS.BAD_REQUEST);
    }

    const started = await startAudionJourneySegment({
      projectId: audionProjectId,
      flow: journeyFlow,
      name: `${row.name} · live test`,
    });
    if (!started.ok) {
      return apiError(started.error, API_STATUS.BAD_REQUEST);
    }

    return platformJson({
      studyId: started.studyId,
      waveId: started.waveId,
      jobId: started.jobId,
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow run/journey POST' });
  }
}
