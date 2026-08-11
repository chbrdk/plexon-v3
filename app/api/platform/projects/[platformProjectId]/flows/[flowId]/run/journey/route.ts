/**
 * Start-only Audion journey segment for the live board (Wave 6).
 * Creates + starts a Study/Wave from the embedded journey subgraph and returns immediately —
 * the board polls `GET …/journey-jobs/:jobId` client-side to paint node states.
 * Wave 17: first slot creates a `collection_flow_runs` row (`trigger: ui`); later slots reuse `historyRunId`.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 / Wave 17 implementation notes
 */
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  documentHasJourneySegment,
  ensureFlowDocument,
  listJourneyPersonaSlots,
  resolveJourneyFlowForRun,
  scanNodeUrl,
  startNodeUrl,
} from '@/lib/collection-test-flow';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { isSessionOwnedFlowTrigger } from '@/lib/collection-flow-run-triggers';
import {
  closedUiRunRequest,
  createCollectionFlowRun,
  getCollectionFlowRun,
  patchCollectionFlowRun,
} from '@/lib/db/collection-flow-runs';
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
    const personaNodeId =
      typeof body.personaNodeId === 'string' && body.personaNodeId.trim()
        ? body.personaNodeId.trim()
        : null;
    const historyRunIdIn =
      typeof body.historyRunId === 'string' && body.historyRunId.trim()
        ? body.historyRunId.trim()
        : null;

    let historyRunId = historyRunIdIn;
    if (historyRunId) {
      const existing = await getCollectionFlowRun(id, fid, historyRunId);
      if (!existing || !isSessionOwnedFlowTrigger(existing.trigger)) {
        return apiError('history run not found', API_STATUS.NOT_FOUND);
      }
      await patchCollectionFlowRun({
        runId: historyRunId,
        status: 'running',
        request: closedUiRunRequest({ ...body, phase: 'journey' }),
      });
    } else {
      const created = await createCollectionFlowRun({
        flowId: fid,
        platformProjectId: id,
        trigger: 'ui',
        status: 'running',
        request: closedUiRunRequest({ ...body, phase: 'journey' }),
      });
      historyRunId = created.id;
    }

    const failHistory = async (message: string, status: number) => {
      await patchCollectionFlowRun({
        runId: historyRunId!,
        status: 'error',
        error: message,
      });
      return apiError(message, status);
    };

    const baseUrl = urlOverride ?? startNodeUrl(doc.nodes) ?? scanNodeUrl(doc.nodes);
    if (!baseUrl) {
      return failHistory(
        'Start URL missing — set start node urlKey or pass url',
        API_STATUS.BAD_REQUEST
      );
    }

    const audionProjectId = await getExternalProjectId(id, 'audion');
    if (!audionProjectId) {
      return failHistory(
        'AUDION binding missing — bind an Audion project on this Collection',
        API_STATUS.BAD_REQUEST
      );
    }

    const slots = listJourneyPersonaSlots(doc);
    const slot =
      (personaNodeId ? slots.find((s) => s.nodeId === personaNodeId) : null) ??
      slots.find((s) => s.primary) ??
      slots[0] ??
      null;

    const journeyFlow = resolveJourneyFlowForRun(doc, baseUrl, {
      personaNodeId: slot?.nodeId ?? personaNodeId,
    });
    if (!journeyFlow) {
      return failHistory('Journey flow missing on document', API_STATUS.BAD_REQUEST);
    }

    const label = slot?.personaName || slot?.personaId || 'primary';
    const started = await startAudionJourneySegment({
      projectId: audionProjectId,
      flow: journeyFlow,
      name: `${row.name} · ${label}`,
    });
    if (!started.ok) {
      return failHistory(started.error, API_STATUS.BAD_REQUEST);
    }

    const slotIndex = slot ? slots.findIndex((s) => s.nodeId === slot.nodeId) : 0;
    const nextSlot = slotIndex >= 0 ? slots[slotIndex + 1] : undefined;

    return platformJson({
      studyId: started.studyId,
      waveId: started.waveId,
      jobId: started.jobId,
      personaNodeId: slot?.nodeId ?? null,
      personaIndex: slotIndex >= 0 ? slotIndex : 0,
      personaCount: Math.max(slots.length, 1),
      nextPersonaNodeId: nextSlot?.nodeId ?? null,
      personaSlots: slots.map((s) => ({
        nodeId: s.nodeId,
        personaId: s.personaId,
        personaName: s.personaName,
        primary: s.primary,
        via: s.via,
      })),
      historyRunId,
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow run/journey POST' });
  }
}
