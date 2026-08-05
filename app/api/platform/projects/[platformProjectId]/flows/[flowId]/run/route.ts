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
  qualityScanNode,
  resolveJourneyFlowForRun,
  resolveScoreForGate,
  scanNodeUrl,
  scoreGateNode,
  scoreGateThreshold,
  startNodeUrl,
  type CollectionFlowLastRun,
  type CollectionFlowScanMode,
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
  fetchCheckionScanScores,
  runCheckionSingleScan,
} from '@/lib/integrations/checkion-scans-client';
import {
  fetchCheckionDomainScanV3Issues,
  runCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
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

    // Wave 6: board already ran the journey segment live (POST …/run/journey + poll) and
    // hands off the finished job here — skip re-running AUDION, go straight to the scan.
    const phase = typeof body.phase === 'string' ? body.phase.trim() : null;
    const handoffJobId =
      typeof body.audionJobId === 'string' && body.audionJobId.trim() ? body.audionJobId.trim() : null;
    const isQualityPhaseHandoff = hasJourney && phase === 'quality' && Boolean(handoffJobId);

    if (isQualityPhaseHandoff) {
      audionJobId = handoffJobId;
      audionStudyId =
        typeof body.audionStudyId === 'string' && body.audionStudyId.trim()
          ? body.audionStudyId.trim()
          : null;
      audionWaveId =
        typeof body.audionWaveId === 'string' && body.audionWaveId.trim()
          ? body.audionWaveId.trim()
          : null;
      stepUrl =
        typeof body.stepUrl === 'string' && body.stepUrl.trim() ? body.stepUrl.trim() : null;
      taskCompleted = body.taskCompleted === true;
      journeyValidEvidence = body.journeyValidEvidence === true;
      if (stepUrl) scanUrl = stepUrl;
    } else if (hasJourney) {
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

    const qualityNode = qualityScanNode(doc.nodes);
    const useDomain = qualityNode?.kind === 'domain_scan';
    const pageScanMode: CollectionFlowScanMode =
      qualityNode?.scanMode === 'deep' ? 'deep' : 'single';
    const scoreGate = scoreGateNode(doc.nodes);

    type QualityResult = {
      ok: boolean;
      error?: string;
      id: string | null;
      status: string;
      overallScore: number | null;
      url: string;
      scanError?: string | null;
      domainScanId?: string | null;
      scanMode: CollectionFlowScanMode | 'domain';
      pageScanId?: string | null;
    };

    let quality: QualityResult;
    if (useDomain) {
      const domainResult = await runCheckionDomainScanV3({
        projectId: checkionProjectId,
        url: scanUrl,
        maxPages:
          typeof qualityNode?.maxPages === 'number' ? qualityNode.maxPages : undefined,
      });
      if (!domainResult.ok) {
        quality = {
          ok: false,
          error: domainResult.error,
          id: domainResult.scan?.id ?? null,
          status: domainResult.scan?.status ?? 'failed',
          overallScore: domainResult.scan?.overallScore ?? null,
          url: domainResult.scan?.url || scanUrl,
          scanError: domainResult.scan?.error ?? null,
          domainScanId: domainResult.scan?.id ?? null,
          scanMode: 'domain',
          pageScanId: null,
        };
      } else {
        quality = {
          ok: true,
          id: domainResult.scan.id,
          status: domainResult.scan.status,
          overallScore: domainResult.scan.overallScore,
          url: domainResult.scan.url || scanUrl,
          scanError: domainResult.scan.error ?? null,
          domainScanId: domainResult.scan.id,
          scanMode: 'domain',
          pageScanId: null,
        };
      }
    } else {
      const scanResult = await runCheckionSingleScan({
        projectId: checkionProjectId,
        url: scanUrl,
        mode: pageScanMode,
        platformProjectId: id,
        audionRunId: audionJobId,
        stepUrl: stepUrl ?? scanUrl,
      });
      if (!scanResult.ok) {
        quality = {
          ok: false,
          error: scanResult.error,
          id: scanResult.scan?.id ?? null,
          status: scanResult.scan?.status ?? 'failed',
          overallScore: scanResult.scan?.overallScore ?? null,
          url: scanResult.scan?.url || scanUrl,
          scanError: scanResult.scan?.error ?? null,
          domainScanId: null,
          scanMode: pageScanMode,
          pageScanId: scanResult.scan?.id ?? null,
        };
      } else {
        quality = {
          ok: true,
          id: scanResult.scan.id,
          status: scanResult.scan.status,
          overallScore: scanResult.scan.overallScore,
          url: scanResult.scan.url || scanUrl,
          scanError: scanResult.scan.error ?? null,
          domainScanId: null,
          scanMode: pageScanMode,
          pageScanId: scanResult.scan.id,
        };
      }
    }

    const blockers: string[] = [];
    if (!quality.ok) {
      blockers.push(quality.error ?? 'Scan fehlgeschlagen');
      const verdictBase = deriveCollectionVerdict({
        scanStatus: quality.status,
        overallScore: quality.overallScore,
        threshold,
        blockers,
        hasJourneySegment: hasJourney,
        taskCompleted,
        journeyValidEvidence,
        scoreGate,
      });
      const errorVerdict: CollectionVerdict = {
        ...verdictBase,
        status: 'error',
        flowCompleted: false,
        collectionReady: false,
        pageEvidenceValid: false,
        pageEvidenceCaveat: quality.error ?? 'Scan fehlgeschlagen',
        summary: `Fehler — ${quality.error ?? 'Scan fehlgeschlagen'}`,
        blockers,
      };
      const lastRun: CollectionFlowLastRun = {
        startedAt,
        completedAt: new Date().toISOString(),
        scanId: quality.pageScanId ?? null,
        domainScanId: quality.domainScanId ?? null,
        scanMode: quality.scanMode,
        url: scanUrl,
        status: quality.status,
        overallScore: quality.overallScore,
        error: quality.error ?? null,
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

    if (quality.scanError) blockers.push(quality.scanError);

    const hasIssues = documentHasIssueGate(doc);
    const gate = issueGateNode(doc.nodes);
    let issueSignals: IssueGateSignals | null = null;
    if (hasIssues && quality.id) {
      if (useDomain) {
        const issuesRes = await fetchCheckionDomainScanV3Issues(quality.id);
        if (!issuesRes.ok) blockers.push(issuesRes.error);
        else issueSignals = issuesRes.signals;
      } else {
        const issuesRes = await fetchCheckionScanIssues(quality.id);
        if (!issuesRes.ok) blockers.push(issuesRes.error);
        else issueSignals = issuesRes.signals;
      }
    }

    let gatedScore: number | null | undefined = undefined;
    let scoresByKind: Record<string, number> | null = null;
    const scoreKind = (scoreGate?.scoreKind ?? 'overall').trim().toLowerCase() || 'overall';
    if (!useDomain && scoreKind !== 'overall' && quality.pageScanId) {
      const scoresRes = await fetchCheckionScanScores(quality.pageScanId);
      if (!scoresRes.ok) {
        blockers.push(scoresRes.error);
      } else {
        scoresByKind = scoresRes.byKind;
        gatedScore = resolveScoreForGate(scoreGate, quality.overallScore, scoresByKind);
        if (gatedScore == null) {
          blockers.push(`Score kind „${scoreKind}“ fehlt`);
        }
      }
    } else {
      gatedScore = resolveScoreForGate(scoreGate, quality.overallScore, null);
    }

    const verdict = deriveCollectionVerdict({
      scanStatus: quality.status,
      overallScore: quality.overallScore,
      gatedScore,
      threshold,
      blockers,
      hasJourneySegment: hasJourney,
      taskCompleted,
      journeyValidEvidence,
      scoreGate,
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
        scanId: quality.pageScanId ?? quality.id,
        stepUrl: stepUrl ?? quality.url ?? scanUrl,
        overallScore: quality.overallScore,
      });
      waveEvaluateOk = rollup.waveEvaluateOk;
      waveRollupOk = rollup.ok && rollup.waveRollupOk;
    }

    const distillate = await distillCollectionFlowToKnowledgePack({
      platformProjectId: id,
      flowId: fid,
      verdict,
      scanId: quality.pageScanId ?? quality.id,
      overallScore: quality.overallScore,
      updatedByUserId: user.id,
    });
    knowledgeDistillateOk = distillate.ok;

    const lastRun: CollectionFlowLastRun = {
      startedAt,
      completedAt: new Date().toISOString(),
      scanId: quality.pageScanId ?? null,
      domainScanId: quality.domainScanId ?? null,
      scanMode: quality.scanMode,
      scoreKind: scoreKind !== 'overall' ? scoreKind : null,
      url: quality.url || scanUrl,
      status: quality.status,
      overallScore: quality.overallScore,
      error: quality.scanError ?? null,
      audionJobId,
      audionStudyId,
      audionWaveId,
      stepUrl: stepUrl ?? quality.url ?? scanUrl,
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
