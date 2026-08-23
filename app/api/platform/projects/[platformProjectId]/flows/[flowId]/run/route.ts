import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import { ensureFlowDocument } from '@/lib/collection-test-flow';
import { executeCollectionFlowRun } from '@/lib/collection-flow-execute';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { isSessionOwnedFlowTrigger } from '@/lib/collection-flow-run-triggers';
import {
  closedUiRunRequest,
  createCollectionFlowRun,
  getCollectionFlowRun,
  patchCollectionFlowRun,
  toCollectionFlowRunResponse,
} from '@/lib/db/collection-flow-runs';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';
/** Dual-layer EQC flow runs — keep in sync with `EQC_LONG_RUNNING_MAX_DURATION_SEC`. */
export const maxDuration = 900;

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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const phase = typeof body.phase === 'string' ? body.phase.trim() : '';
    const historyRunIdIn =
      typeof body.historyRunId === 'string' && body.historyRunId.trim()
        ? body.historyRunId.trim()
        : null;

    // Journey failed before quality — mark the same UI history row as error (Wave 17).
    if (phase === 'abort') {
      if (!historyRunIdIn) {
        return apiError('historyRunId required for abort', API_STATUS.BAD_REQUEST);
      }
      const existing = await getCollectionFlowRun(id, fid, historyRunIdIn);
      if (!existing || !isSessionOwnedFlowTrigger(existing.trigger)) {
        return apiError('Not found', API_STATUS.NOT_FOUND);
      }
      const errMsg =
        typeof body.error === 'string' && body.error.trim()
          ? body.error.trim()
          : 'Journey aborted';
      const patched = await patchCollectionFlowRun({
        runId: historyRunIdIn,
        status: 'error',
        error: errMsg,
      });
      return platformJson({
        historyRunId: historyRunIdIn,
        run: patched ? toCollectionFlowRunResponse(patched) : null,
      });
    }

    let historyRunId = historyRunIdIn;
    if (historyRunId) {
      const existing = await getCollectionFlowRun(id, fid, historyRunId);
      if (!existing || !isSessionOwnedFlowTrigger(existing.trigger)) {
        return apiError('history run not found', API_STATUS.NOT_FOUND);
      }
      // Wave 23 — resume: seed prior context from paused run when client omits it.
      if (body.resume === true) {
        const prior = existing.lastRun as {
          context?: unknown;
          awaitingNodeId?: string | null;
        } | null;
        if (prior?.context != null && body.priorContext == null) {
          body.priorContext = prior.context;
        }
        if (
          typeof prior?.awaitingNodeId === 'string' &&
          prior.awaitingNodeId &&
          body.resumeFromNodeId == null
        ) {
          body.resumeFromNodeId = prior.awaitingNodeId;
        }
      }
      await patchCollectionFlowRun({
        runId: historyRunId,
        status: 'running',
        request: closedUiRunRequest(body),
      });
    } else {
      const created = await createCollectionFlowRun({
        flowId: fid,
        platformProjectId: id,
        trigger: 'ui',
        status: 'running',
        request: closedUiRunRequest(body),
      });
      historyRunId = created.id;
    }

    const result = await executeCollectionFlowRun({
      platformProjectId: id,
      flowId: fid,
      flowName: row.name,
      doc,
      body: { ...body, historyRunId },
      updatedByUserId: user.id,
    });

    if (!result.ok) {
      await patchCollectionFlowRun({
        runId: historyRunId,
        status: 'error',
        error: result.message,
      });
      return apiError(result.message, result.status);
    }

    const runStatus =
      result.lastRun.status === 'awaiting_input'
        ? 'awaiting_input'
        : result.verdict.status === 'error' || result.lastRun.status === 'error'
          ? 'error'
          : 'complete';

    await patchCollectionFlowRun({
      runId: historyRunId,
      status: runStatus,
      verdict: result.verdict,
      lastRun: result.lastRun,
      error: result.lastRun.error ?? null,
    });

    return platformJson({
      flow: result.flow,
      verdict: result.verdict,
      lastRun: result.lastRun,
      nodeStates: result.nodeStates,
      historyRunId,
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow run POST' });
  }
}
