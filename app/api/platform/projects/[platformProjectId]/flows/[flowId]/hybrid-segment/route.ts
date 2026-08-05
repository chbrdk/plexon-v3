/**
 * Hybrid Agent-Segment for one journey node (Wave 6).
 * Proxies to Audion `POST /api/studies/flows/hybrid-segment`.
 */
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  ensureFlowDocument,
  resolveJourneyFlowForRun,
  scanNodeUrl,
  startNodeUrl,
} from '@/lib/collection-test-flow';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { postHybridSegment } from '@/lib/integrations/audion-journey-client';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

    const audionProjectId = await getExternalProjectId(id, 'audion');
    if (!audionProjectId) {
      return apiError('AUDION binding missing', API_STATUS.BAD_REQUEST);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const nodeId = typeof body.nodeId === 'string' ? body.nodeId.trim() : '';
    if (!nodeId) return apiError('nodeId required', API_STATUS.BAD_REQUEST);

    const doc = ensureFlowDocument(row.flow);
    const baseUrl = startNodeUrl(doc.nodes) ?? scanNodeUrl(doc.nodes) ?? 'https://example.com';
    const journeyFlow = resolveJourneyFlowForRun(doc, baseUrl);
    if (!journeyFlow) {
      return apiError('Journey flow missing', API_STATUS.BAD_REQUEST);
    }

    const result = await postHybridSegment({
      projectId: audionProjectId,
      nodeId,
      flow: journeyFlow,
    });
    if (!result.ok) return apiError(result.error, 502);
    return platformJson({ ok: true, jobId: result.jobId ?? null });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow hybrid-segment POST' });
  }
}
