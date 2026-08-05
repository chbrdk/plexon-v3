import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  deriveCollectionVerdict,
  deriveJourneyErrorVerdict,
  documentHasIssueGate,
  documentHasJourneySegment,
  ensureFlowDocument,
  issueGateNode,
  nodeStatesFromVerdict,
  resolveJourneyFlowForRun,
  scanNodeUrl,
  scoreGateThreshold,
  startNodeUrl,
  type CollectionFlowLastRun,
  type CollectionVerdict,
  type IssueGateSignals,
} from '@/lib/collection-test-flow';
import {
  getCollectionTestFlow,
  persistFlowRunResult,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { runAudionJourneySegment, rollupCollectionVerdictToAudionWave } from '@/lib/integrations/audion-journey-client';
import {
  fetchCheckionScanIssues,
  runCheckionSingleScan,
} from '@/lib/integrations/checkion-scans-client';
import { distillCollectionFlowToKnowledgePack } from '@/lib/collection-flow-knowledge-distillate';
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
    const baseUrl =
      urlOverride ?? scanNodeUrl(doc.nodes) ?? startNodeUrl(doc.nodes);
    if (!baseUrl) {
      return apiError('Scan URL missing — set domain or pass url', API_STATUS.BAD_REQUEST);
    }

    const checkionProjectId = await getExternalProjectId(id, 'checkion');
    if (!checkionProjectId) {
      return apiError(
        'CHECKION binding missing — bind a Checkion project on this Collection',
        API_STATUS.BAD_REQUEST
      );
    }

    const hasJourney = documentHasJourneySegment(doc);
    const startedAt = new Date().toISOString();
    const threshold = scoreGateThreshold(doc.nodes);

    let audionJobId: string | null = null;
    let audionStudyId: string | null = null;
    let audionWaveId: string | null = null;
    let stepUrl: string | null = null;
    let scanUrl = baseUrl;
    let taskCompleted = !hasJourney;
    let journeyValidEvidence = !hasJourney;

    if (hasJourney) {
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

      const journey = await runAudionJourneySegment({
        projectId: audionProjectId,
        flow: journeyFlow,
        name: `${row.name} · journey`,
      });

      if (!journey.ok) {
        audionStudyId = journey.studyId ?? null;
        audionWaveId = journey.waveId ?? null;
        audionJobId = journey.jobId ?? null;
        if (journey.job) {
          taskCompleted = journey.job.taskCompleted;
          journeyValidEvidence = journey.job.validEvidence;
          stepUrl = journey.job.finalUrl;
        }
        const verdict = deriveJourneyErrorVerdict({
          error: journey.error,
          threshold,
        });
        const lastRun: CollectionFlowLastRun = {
          startedAt,
          completedAt: new Date().toISOString(),
          scanId: null,
          url: baseUrl,
          status: 'error',
          overallScore: null,
          error: journey.error,
          audionJobId,
          audionStudyId,
          audionWaveId,
          stepUrl,
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
          nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
        });
      }

      audionStudyId = journey.studyId;
      audionWaveId = journey.waveId;
      audionJobId = journey.jobId;
      taskCompleted = journey.job.taskCompleted;
      journeyValidEvidence = journey.job.validEvidence;
      stepUrl = journey.job.finalUrl;
      if (journey.job.finalUrl) scanUrl = journey.job.finalUrl;
    }

    const scanResult = await runCheckionSingleScan({
      projectId: checkionProjectId,
      url: scanUrl,
      platformProjectId: id,
      audionRunId: audionJobId,
      stepUrl: stepUrl ?? scanUrl,
    });

    const blockers: string[] = [];
    if (!scanResult.ok) {
      blockers.push(scanResult.error);
      const partial = scanResult.scan;
      const verdictBase = deriveCollectionVerdict({
        scanStatus: partial?.status ?? 'failed',
        overallScore: partial?.overallScore ?? null,
        threshold,
        blockers,
        hasJourneySegment: hasJourney,
        taskCompleted,
        journeyValidEvidence,
      });
      const errorVerdict: CollectionVerdict = {
        ...verdictBase,
        status: 'error',
        flowCompleted: false,
        collectionReady: false,
        pageEvidenceValid: false,
        pageEvidenceCaveat: scanResult.error,
        summary: `Fehler — ${scanResult.error}`,
        blockers,
      };
      const lastRun: CollectionFlowLastRun = {
        startedAt,
        completedAt: new Date().toISOString(),
        scanId: partial?.id ?? null,
        url: scanUrl,
        status: partial?.status ?? 'error',
        overallScore: partial?.overallScore ?? null,
        error: scanResult.error,
        audionJobId,
        audionStudyId,
        audionWaveId,
        stepUrl: stepUrl ?? scanUrl,
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
        nodeStates: nodeStatesFromVerdict(doc, errorVerdict, lastRun),
      });
    }

    const scan = scanResult.scan;
    if (scan.error) blockers.push(scan.error);

    const hasIssues = documentHasIssueGate(doc);
    const gate = issueGateNode(doc.nodes);
    let issueSignals: IssueGateSignals | null = null;
    if (hasIssues && scan.id) {
      const issuesRes = await fetchCheckionScanIssues(scan.id);
      if (!issuesRes.ok) {
        blockers.push(issuesRes.error);
      } else {
        issueSignals = issuesRes.signals;
      }
    }

    const verdict = deriveCollectionVerdict({
      scanStatus: scan.status,
      overallScore: scan.overallScore,
      threshold,
      blockers,
      hasJourneySegment: hasJourney,
      taskCompleted,
      journeyValidEvidence,
      issueGate: gate,
      issueSignals,
    });

    let waveEvaluateOk: boolean | null = null;
    let waveRollupOk: boolean | null = null;
    let knowledgeDistillateOk: boolean | null = null;

    if (audionStudyId && audionWaveId) {
      const rollup = await rollupCollectionVerdictToAudionWave({
        studyId: audionStudyId,
        waveId: audionWaveId,
        platformProjectId: id,
        flowId: fid,
        verdict,
        scanId: scan.id,
        stepUrl: stepUrl ?? scan.url ?? scanUrl,
        overallScore: scan.overallScore,
      });
      waveEvaluateOk = rollup.waveEvaluateOk;
      waveRollupOk = rollup.ok && rollup.waveRollupOk;
    }

    // Best-effort KP distillate (journey + quality-only)
    const distillate = await distillCollectionFlowToKnowledgePack({
      platformProjectId: id,
      flowId: fid,
      verdict,
      scanId: scan.id,
      overallScore: scan.overallScore,
      updatedByUserId: user.id,
    });
    knowledgeDistillateOk = distillate.ok;

    const lastRun: CollectionFlowLastRun = {
      startedAt,
      completedAt: new Date().toISOString(),
      scanId: scan.id,
      url: scan.url || scanUrl,
      status: scan.status,
      overallScore: scan.overallScore,
      error: scan.error ?? null,
      audionJobId,
      audionStudyId,
      audionWaveId,
      stepUrl: stepUrl ?? scan.url ?? scanUrl,
      issueCount: issueSignals?.issueCount ?? null,
      criticalCount: issueSignals?.criticalCount ?? null,
      issueGateBranch: verdict.issueGateBranch,
      waveEvaluateOk,
      waveRollupOk,
      knowledgeDistillateOk,
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
      nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flow run POST' });
  }
}
