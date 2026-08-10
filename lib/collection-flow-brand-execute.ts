/**
 * Wave 24 — Brand-only Collection Flow run (no Checkion scan/geo).
 */

import { API_STATUS } from '@/lib/api-error-handler';
import {
  deriveCollectionVerdict,
  documentHasJourneySegment,
  nodeStatesFromVerdict,
  type CollectionFlowLastRun,
  type CollectionFlowNodeRunState,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
} from '@/lib/collection-test-flow';
import { runBrandMeasureSegment } from '@/lib/collection-flow-brand-segment';
import {
  applySetNodes,
  emptyRunContext,
  evaluateAllCompares,
  seedStartNodeIntoContext,
  setContextBundle,
} from '@/lib/collection-flow-run-context';
import {
  persistFlowRunResult,
  toCollectionTestFlowResponse,
  type CollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';

type BrandExecuteSuccess = {
  ok: true;
  flow: CollectionTestFlowResponse | null;
  verdict: CollectionVerdict;
  lastRun: CollectionFlowLastRun;
  nodeStates: Record<string, CollectionFlowNodeRunState>;
};

type BrandExecuteFailure = {
  ok: false;
  status: number;
  message: string;
};

export async function executeBrandCollectionFlowRun(input: {
  platformProjectId: string;
  flowId: string;
  flowName: string;
  doc: CollectionTestFlowDocument;
  body: Record<string, unknown>;
  updatedByUserId?: string | null;
}): Promise<BrandExecuteSuccess | BrandExecuteFailure> {
  const id = input.platformProjectId;
  const fid = input.flowId;
  const doc = input.doc;

  if (documentHasJourneySegment(doc)) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'Brand-only run cannot include journey — add scan/geo or remove journey nodes',
    };
  }

  const startedAt = new Date().toISOString();
  let runContext = emptyRunContext();
  const seeded = seedStartNodeIntoContext(runContext, doc.nodes);
  runContext = seeded.ctx;
  runContext = setContextBundle(runContext, 'run', { url: '', startedAt });

  const brand = await runBrandMeasureSegment({
    platformProjectId: id,
    doc,
    ctx: runContext,
    plexonUserId: input.updatedByUserId ?? null,
  });
  runContext = brand.ctx;

  if (!brand.ok) {
    const compareResults = evaluateAllCompares(doc.nodes, applySetNodes(doc.nodes, runContext)).map(
      (r) => ({
        nodeId: r.nodeId,
        path: r.path,
        passed: r.passed,
        actual: r.actual ?? null,
      })
    );
    const verdictBase = deriveCollectionVerdict({
      scanStatus: 'failed',
      overallScore: null,
      gatedScore: null,
      threshold: 0,
      blockers: [brand.message],
      hasJourneySegment: false,
      taskCompleted: true,
      journeyValidEvidence: true,
      compareResults: compareResults.length ? compareResults : null,
      requirePageScore: false,
    });
    const verdict: CollectionVerdict = {
      ...verdictBase,
      status: 'error',
      flowCompleted: false,
      collectionReady: false,
      pageEvidenceValid: false,
      pageEvidenceCaveat: brand.message,
      summary: `Fehler — ${brand.message}`,
      blockers: [brand.message],
    };
    const lastRun: CollectionFlowLastRun = {
      startedAt,
      completedAt: new Date().toISOString(),
      scanId: null,
      domainScanId: null,
      geoJobId: null,
      scanMode: null,
      scoreKind: null,
      url: '',
      status: 'failed',
      overallScore: null,
      citedShare: null,
      geoFitness: null,
      error: brand.message,
      audionJobId: null,
      audionStudyId: null,
      audionWaveId: null,
      stepUrl: null,
      issueCount: null,
      criticalCount: null,
      context: runContext,
      compareResults,
    };
    const saved = await persistFlowRunResult({
      platformProjectId: id,
      flowId: fid,
      verdict,
      lastRun,
    });
    return {
      ok: true,
      flow: saved ? toCollectionTestFlowResponse(saved) : null,
      verdict,
      lastRun,
      nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
    };
  }

  runContext = applySetNodes(doc.nodes, runContext);
  const compareEvals = evaluateAllCompares(doc.nodes, runContext);
  const compareResults = compareEvals.map((r) => ({
    nodeId: r.nodeId,
    path: r.path,
    passed: r.passed,
    actual: r.actual ?? null,
  }));
  const hasCompare = compareResults.length > 0;

  const verdict = deriveCollectionVerdict({
    scanStatus: brand.status,
    overallScore: null,
    gatedScore: null,
    threshold: 0,
    blockers: [],
    hasJourneySegment: false,
    taskCompleted: true,
    journeyValidEvidence: true,
    compareResults: hasCompare ? compareResults : null,
    requirePageScore: false,
  });

  const lastRun: CollectionFlowLastRun = {
    startedAt,
    completedAt: new Date().toISOString(),
    scanId: null,
    domainScanId: null,
    geoJobId: null,
    scanMode: null,
    scoreKind: null,
    url: '',
    status: brand.status,
    overallScore: null,
    citedShare: null,
    geoFitness: null,
    error: null,
    audionJobId: null,
    audionStudyId: null,
    audionWaveId: null,
    stepUrl: null,
    issueCount: null,
    criticalCount: null,
    context: runContext,
    compareResults,
  };

  const saved = await persistFlowRunResult({
    platformProjectId: id,
    flowId: fid,
    verdict,
    lastRun,
  });

  return {
    ok: true,
    flow: saved ? toCollectionTestFlowResponse(saved) : null,
    verdict,
    lastRun,
    nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
  };
}
