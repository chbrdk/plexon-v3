import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  deriveCollectionVerdict,
  ensureFlowDocument,
  nodeStatesFromVerdict,
  scanNodeUrl,
  scoreGateThreshold,
  type CollectionFlowLastRun,
} from '@/lib/collection-test-flow';
import {
  getCollectionTestFlow,
  persistFlowRunResult,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { runCheckionSingleScan } from '@/lib/integrations/checkion-scans-client';
import { platformJson } from '@/lib/platform-contract';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
    const urlOverride =
      typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null;
    const url = urlOverride ?? scanNodeUrl(doc.nodes);
    if (!url) {
      return apiError('Scan URL missing — set domain or pass url', API_STATUS.BAD_REQUEST);
    }

    const checkionProjectId = await getExternalProjectId(id, 'checkion');
    if (!checkionProjectId) {
      return apiError(
        'CHECKION binding missing — bind a Checkion project on this Collection',
        API_STATUS.BAD_REQUEST
      );
    }

    const startedAt = new Date().toISOString();
    const threshold = scoreGateThreshold(doc.nodes);
    const scanResult = await runCheckionSingleScan({
      projectId: checkionProjectId,
      url,
      platformProjectId: id,
    });

    const blockers: string[] = [];
    if (!scanResult.ok) {
      blockers.push(scanResult.error);
      const partial = scanResult.scan;
      const verdict = deriveCollectionVerdict({
        scanStatus: partial?.status ?? 'failed',
        overallScore: partial?.overallScore ?? null,
        threshold,
        blockers,
      });
      const lastRun: CollectionFlowLastRun = {
        startedAt,
        completedAt: new Date().toISOString(),
        scanId: partial?.id ?? null,
        url,
        status: partial?.status ?? 'error',
        overallScore: partial?.overallScore ?? null,
        error: scanResult.error,
      };
      // Force error status when client failed before/during poll
      const errorVerdict = {
        ...verdict,
        status: 'error' as const,
        flowCompleted: false,
        collectionReady: false,
        pageEvidenceValid: false,
        pageEvidenceCaveat: scanResult.error,
        summary: `Fehler — ${scanResult.error}`,
        blockers,
      };
      const saved = await persistFlowRunResult({
        platformProjectId: id,
        flowId: fid,
        verdict: errorVerdict,
        lastRun,
      });
      return platformJson({
        flow: saved ? toCollectionTestFlowResponse(saved) : null,
        verdict: errorVerdict,
        lastRun,
        nodeStates: nodeStatesFromVerdict(doc, errorVerdict),
      });
    }

    const scan = scanResult.scan;
    if (scan.error) blockers.push(scan.error);

    const verdict = deriveCollectionVerdict({
      scanStatus: scan.status,
      overallScore: scan.overallScore,
      threshold,
      blockers,
    });

    const lastRun: CollectionFlowLastRun = {
      startedAt,
      completedAt: new Date().toISOString(),
      scanId: scan.id,
      url: scan.url || url,
      status: scan.status,
      overallScore: scan.overallScore,
      error: scan.error ?? null,
    };

    const saved = await persistFlowRunResult({
      platformProjectId: id,
      flowId: fid,
      verdict,
      lastRun,
    });

    return platformJson({
      flow: saved ? toCollectionTestFlowResponse(saved) : null,
      verdict,
      lastRun,
      nodeStates: nodeStatesFromVerdict(doc, verdict),
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow run POST' });
  }
}
