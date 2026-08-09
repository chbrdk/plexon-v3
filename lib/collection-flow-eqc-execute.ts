/**
 * Wave 23 — Event Quick Check spine on Collection Flow runtime.
 * @see specs/domain/eqc-as-collection-flow.md
 */

import { API_STATUS } from '@/lib/api-error-handler';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { researchCompanyBrief } from '@/lib/assistant/event-quick-check/research-company-brief';
import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import { runPersonaAndGeoQuestionsStep } from '@/lib/assistant/event-quick-check/run-persona-and-geo-step';
import {
  buildBriefCatalogBundle,
  buildCompetitorsCatalogBundle,
  buildDomainCatalogBundle,
  buildGeoCatalogBundle,
  buildPersonaCatalogBundle,
  buildQueriesCatalogBundle,
  emptyRunContext,
  evaluateAllCompares,
  resolveDocumentStringParams,
  resolveFlowParamString,
  resolveRunUrlChain,
  seedStartNodeIntoContext,
  setContextBundle,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import type {
  ExecuteCollectionFlowRunFailure,
  ExecuteCollectionFlowRunSuccess,
} from '@/lib/collection-flow-execute';
import {
  deriveCollectionVerdict,
  documentHasEqcSpine,
  geoJobNode,
  geoJobQueriesFromText,
  nodeStatesFromVerdict,
  qualityScanNode,
  scoreGateThreshold,
  type CollectionFlowConfirmKind,
  type CollectionFlowLastRun,
  type CollectionFlowNode,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
} from '@/lib/collection-test-flow';
import {
  persistFlowRunResult,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { patchCollectionFlowRun } from '@/lib/db/collection-flow-runs';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import {
  fetchCheckionDomainScanV3Issues,
  runCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import { runCheckionGeoJobV3 } from '@/lib/integrations/checkion-geo-jobs-v3-client';
import { suggestCheckionProjectCompetitors } from '@/lib/integrations/checkion-project-competitors-client';
import {
  resolveEventQuickCheckProfile,
  type EventQuickCheckDepth,
} from '@/lib/paths/assistant-workflows';

function linearThenPath(doc: CollectionTestFlowDocument): CollectionFlowNode[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const start = doc.nodes.find((n) => n.kind === 'start') ?? doc.nodes[0];
  if (!start) return [];
  const outs = new Map<string, string>();
  for (const e of doc.edges) {
    if ((e.edgeKind ?? 'then') === 'then' || e.edgeKind === 'when') {
      if (!outs.has(e.source)) outs.set(e.source, e.target);
    }
  }
  const path: CollectionFlowNode[] = [start];
  const seen = new Set([start.id]);
  let cur = start.id;
  while (outs.has(cur)) {
    const nextId = outs.get(cur)!;
    if (seen.has(nextId)) break;
    const n = byId.get(nextId);
    if (!n) break;
    path.push(n);
    seen.add(nextId);
    cur = nextId;
    if (n.kind === 'compare' || n.kind === 'quality_ok' || n.kind === 'abandon') {
      // continue through compare when-branch only via outs map (first then/when)
    }
  }
  return path;
}

function confirmKindOf(node: CollectionFlowNode): CollectionFlowConfirmKind {
  return node.confirmKind ?? 'brief';
}

function draftRootForConfirm(kind: CollectionFlowConfirmKind): string {
  switch (kind) {
    case 'brief':
      return 'brief';
    case 'competitors':
      return 'competitors';
    case 'geo_queries':
      return 'queries';
    case 'deep_scan':
      return 'domain';
    default:
      return 'brief';
  }
}

export function isEqcFlowRuntimeEnabled(): boolean {
  const v = (typeof process !== 'undefined' ? process.env.EQC_FLOW_RUNTIME : '') ?? '';
  const t = String(v).trim().toLowerCase();
  // Default on (Wave 23 cutover). Explicit off: 0/false/off/no.
  if (t === '0' || t === 'false' || t === 'off' || t === 'no') return false;
  if (t === '1' || t === 'true' || t === 'yes' || t === 'on' || t === '') return true;
  return true;
}

export async function executeEqcCollectionFlowRun(input: {
  platformProjectId: string;
  flowId: string;
  flowName: string;
  doc: CollectionTestFlowDocument;
  body: Record<string, unknown>;
  historyRunId?: string | null;
}): Promise<ExecuteCollectionFlowRunSuccess | ExecuteCollectionFlowRunFailure> {
  const id = input.platformProjectId;
  const fid = input.flowId;
  const doc = input.doc;
  const body = input.body;
  const startedAt = new Date().toISOString();

  if (!documentHasEqcSpine(doc)) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'EQC spine missing — use template eqc-quality-v1',
    };
  }

  const depthRaw = typeof body.depth === 'string' ? body.depth.trim() : 'quick';
  const depth = (depthRaw === 'complete' ? 'complete' : 'quick') as EventQuickCheckDepth;
  const profile = resolveEventQuickCheckProfile(depth);
  const projectName =
    (typeof body.projectName === 'string' && body.projectName.trim()) || input.flowName || 'Quick Check';

  let runContext: CollectionFlowRunContext = emptyRunContext();
  const seeded = seedStartNodeIntoContext(runContext, doc.nodes);
  runContext = seeded.ctx;
  const urlOverride =
    typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null;
  const startUrl = urlOverride || seeded.startUrl || '';
  runContext = setContextBundle(runContext, 'run', { url: startUrl, startedAt });

  const resume = body.resume === true;
  const resumeFromId =
    typeof body.resumeFromNodeId === 'string' && body.resumeFromNodeId.trim()
      ? body.resumeFromNodeId.trim()
      : null;

  // Restore prior context on resume
  if (resume && body.priorContext && typeof body.priorContext === 'object') {
    const prior = body.priorContext as { outputs?: Record<string, Record<string, unknown>> };
    if (prior.outputs) {
      runContext = { outputs: { ...prior.outputs } };
    }
  }

  const path = linearThenPath(doc);
  let startIdx = 0;
  if (resume && resumeFromId) {
    const idx = path.findIndex((n) => n.id === resumeFromId);
    startIdx = idx >= 0 ? idx + 1 : 0; // continue after the confirm node
  }

  // Apply confirm payload onto context before continuing
  if (resume && body.confirmKind && body.payload != null) {
    const kind = String(body.confirmKind) as CollectionFlowConfirmKind;
    const root = draftRootForConfirm(kind);
    if (kind === 'brief' && typeof body.payload === 'object') {
      runContext = setContextBundle(
        runContext,
        root,
        buildBriefCatalogBundle(body.payload as Record<string, unknown>)
      );
    } else if (kind === 'competitors' && Array.isArray(body.payload)) {
      runContext = setContextBundle(
        runContext,
        root,
        buildCompetitorsCatalogBundle(body.payload as string[])
      );
    } else if (kind === 'geo_queries' && Array.isArray(body.payload)) {
      runContext = setContextBundle(
        runContext,
        root,
        buildQueriesCatalogBundle(body.payload as string[])
      );
    }
  }

  const checkionProjectId = await getExternalProjectId(id, 'checkion');
  const audionProjectId = await getExternalProjectId(id, 'audion');
  if (!checkionProjectId) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'CHECKION binding missing — bootstrap Collection first',
    };
  }

  let domainScanId: string | null = null;
  let geoJobId: string | null = null;
  let overallScore: number | null = null;
  let scanUrl = startUrl;
  let citedShare: number | null = null;
  let geoFitness: number | null = null;

  for (let i = startIdx; i < path.length; i++) {
    const node = path[i]!;
    const resolvedNodes = resolveDocumentStringParams(doc.nodes, runContext);
    const resolved = resolvedNodes.find((n) => n.id === node.id) ?? node;

    if (node.kind === 'start') continue;

    if (node.kind === 'research_brief') {
      const brief = await researchCompanyBrief({
        url: startUrl,
        projectName,
      });
      runContext = setContextBundle(
        runContext,
        'brief',
        buildBriefCatalogBundle(brief as unknown as Record<string, unknown>),
        node.id
      );
      continue;
    }

    if (node.kind === 'competitors_suggest') {
      const suggested = await suggestCheckionProjectCompetitors({
        projectId: checkionProjectId,
        url: startUrl,
      });
      const items = suggested.ok ? suggested.competitors ?? [] : [];
      runContext = setContextBundle(
        runContext,
        'competitors',
        buildCompetitorsCatalogBundle(items),
        node.id
      );
      continue;
    }

    if (node.kind === 'human_confirm') {
      const kind = confirmKindOf(node);
      const threshold = scoreGateThreshold(doc.nodes);
      const verdictBase = deriveCollectionVerdict({
        scanStatus: 'running',
        overallScore,
        threshold,
        blockers: [],
        hasJourneySegment: false,
        taskCompleted: true,
        journeyValidEvidence: true,
        requirePageScore: false,
      });
      const lastRun: CollectionFlowLastRun = {
        startedAt,
        completedAt: null,
        scanId: null,
        domainScanId,
        geoJobId,
        scanMode: 'domain',
        url: startUrl,
        status: 'awaiting_input',
        overallScore,
        citedShare,
        geoFitness,
        awaitingNodeId: node.id,
        awaitingConfirmKind: kind,
        context: { outputs: runContext.outputs },
      };
      const verdict: CollectionVerdict = {
        ...verdictBase,
        status: 'running',
        flowCompleted: false,
        terminalKind: null,
        terminalNodeId: null,
        pageEvidenceCaveat: `Awaiting confirm: ${kind}`,
        qualityPassed: false,
        collectionReady: false,
        summary: `Warte auf Bestätigung (${kind})`,
      };
      const saved = await persistFlowRunResult({
        platformProjectId: id,
        flowId: fid,
        verdict,
        lastRun,
      });
      if (input.historyRunId) {
        await patchCollectionFlowRun({
          runId: input.historyRunId,
          status: 'awaiting_input',
          verdict,
          lastRun,
        });
      }
      return {
        ok: true,
        flow: saved ? toCollectionTestFlowResponse(saved) : null,
        verdict,
        lastRun,
        nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
      };
    }

    if (node.kind === 'domain_scan') {
      const qualityNode = qualityScanNode(resolvedNodes) ?? resolved;
      const chain = resolveRunUrlChain({
        ctx: runContext,
        urlOverride,
        qualityUrlRaw: qualityNode.url,
        geoUrlRaw: null,
        startUrl,
      });
      const url = chain.qualityUrl || chain.baseUrl || startUrl;
      scanUrl = url || startUrl;
      const domainResult = await runCheckionDomainScanV3({
        projectId: checkionProjectId,
        url: scanUrl,
        maxPages:
          typeof qualityNode.maxPages === 'number' ? qualityNode.maxPages : profile.scanMaxPages,
      });
      if (!domainResult.ok) {
        return failEqc({
          id,
          fid,
          doc,
          startedAt,
          startUrl,
          runContext,
          error: domainResult.error,
          historyRunId: input.historyRunId,
        });
      }
      domainScanId = domainResult.scan.id;
      overallScore = domainResult.scan.overallScore;
      const issuesRes = await fetchCheckionDomainScanV3Issues(domainResult.scan.id);
      runContext = setContextBundle(
        runContext,
        'domain',
        buildDomainCatalogBundle({
          status: domainResult.scan.status,
          overallScore: domainResult.scan.overallScore,
          pageCount: domainResult.scan.pageCount ?? null,
          issues: issuesRes.ok ? issuesRes.signals : null,
          issueItems: issuesRes.ok
            ? issuesRes.items.map((o) => ({
                id: typeof o.id === 'string' ? o.id : undefined,
                severity: typeof o.severity === 'string' ? o.severity : undefined,
                ruleId: typeof o.ruleId === 'string' ? o.ruleId : undefined,
                title: typeof o.title === 'string' ? o.title : undefined,
              }))
            : [],
        }),
        node.id
      );
      continue;
    }

    if (node.kind === 'persona_bootstrap') {
      const brief = runContext.outputs.brief as EventQuickCheckCompanyBrief | undefined;
      const competitors = (runContext.outputs.competitors?.items as string[] | undefined) ?? [];
      const step = await runPersonaAndGeoQuestionsStep({
        profile,
        projectName,
        url: startUrl,
        audionProjectId: audionProjectId ?? undefined,
        companyBrief: brief,
        geoCompetitors: competitors,
        platformProjectId: id,
      });
      if (step.personaOutcome.status === 'error') {
        return failEqc({
          id,
          fid,
          doc,
          startedAt,
          startUrl,
          runContext,
          error: step.personaOutcome.error || 'Persona bootstrap failed',
          historyRunId: input.historyRunId,
        });
      }
      const personas = listPersonasFromPreview(step.personaPreview);
      const primary = personas[0];
      runContext = setContextBundle(
        runContext,
        'persona',
        buildPersonaCatalogBundle({
          id: primary?.id ?? null,
          name: primary?.name ?? null,
          segment: primary?.segment ?? null,
          count: personas.length || 1,
        }),
        node.id
      );
      // Stash draft queries from persona step for suggest_queries / confirm
      if (step.geoQuestions.length) {
        runContext = setContextBundle(
          runContext,
          'queries',
          buildQueriesCatalogBundle(step.geoQuestions),
          node.id
        );
      }
      continue;
    }

    if (node.kind === 'suggest_queries') {
      // Prefer queries already produced during persona_bootstrap; else empty draft.
      const existing = runContext.outputs.queries?.items;
      if (!Array.isArray(existing) || existing.length === 0) {
        const brief = runContext.outputs.brief as EventQuickCheckCompanyBrief | undefined;
        const competitors = (runContext.outputs.competitors?.items as string[] | undefined) ?? [];
        const step = await runPersonaAndGeoQuestionsStep({
          profile,
          projectName,
          url: startUrl,
          audionProjectId: audionProjectId ?? undefined,
          companyBrief: brief,
          geoCompetitors: competitors,
          platformProjectId: id,
        });
        runContext = setContextBundle(
          runContext,
          'queries',
          buildQueriesCatalogBundle(step.geoQuestions),
          node.id
        );
      } else {
        runContext = setContextBundle(
          runContext,
          'queries',
          buildQueriesCatalogBundle(existing as string[]),
          node.id
        );
      }
      continue;
    }

    if (node.kind === 'geo_job') {
      const geoNode = geoJobNode(resolvedNodes) ?? resolved;
      const queries = geoJobQueriesFromText(
        resolveFlowParamString(runContext, geoNode.text) ||
          (typeof runContext.outputs.queries?.text === 'string'
            ? String(runContext.outputs.queries.text)
            : '')
      );
      const companyName =
        resolveFlowParamString(runContext, geoNode.companyName) ||
        (typeof runContext.outputs.brief?.displayName === 'string'
          ? String(runContext.outputs.brief.displayName)
          : projectName);
      const chain = resolveRunUrlChain({
        ctx: runContext,
        urlOverride: null,
        qualityUrlRaw: null,
        geoUrlRaw: geoNode.url,
        startUrl: scanUrl || startUrl,
      });
      const geoResult = await runCheckionGeoJobV3({
        projectId: checkionProjectId,
        platformProjectId: id,
        url: chain.geoUrl || scanUrl || startUrl || undefined,
        companyName: companyName || undefined,
        queries: queries.length ? queries : undefined,
        includePageScan: false,
      });
      if (!geoResult.ok) {
        return failEqc({
          id,
          fid,
          doc,
          startedAt,
          startUrl,
          runContext,
          error: geoResult.error,
          historyRunId: input.historyRunId,
        });
      }
      geoJobId = geoResult.job.id;
      citedShare = geoResult.job.citedShare ?? null;
      geoFitness = geoResult.job.geoFitness ?? null;
      if (geoResult.job.overallScore != null) overallScore = geoResult.job.overallScore;
      runContext = setContextBundle(
        runContext,
        'geo',
        buildGeoCatalogBundle({
          status: geoResult.job.status,
          citedShare,
          geoFitness,
          overallScore: geoResult.job.overallScore ?? null,
          url: geoResult.job.url || scanUrl || startUrl,
        }),
        node.id
      );
      continue;
    }

    if (node.kind === 'compare') {
      // evaluated after loop with all compares
      continue;
    }

    if (node.kind === 'quality_ok' || node.kind === 'abandon') {
      break;
    }
  }

  const compareResults = evaluateAllCompares(doc.nodes, runContext);
  const allPass = compareResults.length === 0 || compareResults.every((c) => c.passed);
  const threshold = scoreGateThreshold(doc.nodes);
  const verdictBase = deriveCollectionVerdict({
    scanStatus: 'completed',
    overallScore,
    threshold,
    blockers: [],
    hasJourneySegment: false,
    taskCompleted: true,
    journeyValidEvidence: true,
    requirePageScore: Boolean(qualityScanNode(doc.nodes)),
  });
  const terminalKind = allPass ? 'quality_ok' : 'abandon';
  const terminalNodeId =
    doc.nodes.find((n) => n.kind === terminalKind)?.id ?? null;
  const verdict: CollectionVerdict = {
    ...verdictBase,
    status: 'complete',
    flowCompleted: true,
    terminalKind,
    terminalNodeId,
    qualityPassed: allPass,
    collectionReady: allPass,
    scorePassed: allPass,
    compareResults: compareResults.map((c) => ({
      nodeId: c.nodeId,
      path: c.path,
      passed: c.passed,
      actual: c.actual as string | number | boolean | null | undefined,
    })),
    summary: allPass ? 'Quick Check bereit' : 'Quick Check nicht bereit',
  };
  const lastRun: CollectionFlowLastRun = {
    startedAt,
    completedAt: new Date().toISOString(),
    scanId: null,
    domainScanId,
    geoJobId,
    scanMode: 'domain',
    url: scanUrl || startUrl,
    status: 'complete',
    overallScore,
    citedShare,
    geoFitness,
    context: { outputs: runContext.outputs },
    compareResults: verdict.compareResults,
  };
  const saved = await persistFlowRunResult({
    platformProjectId: id,
    flowId: fid,
    verdict,
    lastRun,
  });
  if (input.historyRunId) {
    await patchCollectionFlowRun({
      runId: input.historyRunId,
      status: 'complete',
      verdict,
      lastRun,
    });
  }
  return {
    ok: true,
    flow: saved ? toCollectionTestFlowResponse(saved) : null,
    verdict,
    lastRun,
    nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
  };
}

async function failEqc(input: {
  id: string;
  fid: string;
  doc: CollectionTestFlowDocument;
  startedAt: string;
  startUrl: string;
  runContext: CollectionFlowRunContext;
  error: string;
  historyRunId?: string | null;
}): Promise<ExecuteCollectionFlowRunSuccess> {
  const threshold = scoreGateThreshold(input.doc.nodes);
  const verdictBase = deriveCollectionVerdict({
    scanStatus: 'error',
    overallScore: null,
    threshold,
    blockers: [input.error],
    hasJourneySegment: false,
    taskCompleted: false,
    journeyValidEvidence: false,
    requirePageScore: false,
  });
  const verdict: CollectionVerdict = {
    ...verdictBase,
    status: 'error',
    flowCompleted: false,
    terminalKind: null,
    terminalNodeId: null,
    pageEvidenceCaveat: input.error,
    qualityPassed: false,
    collectionReady: false,
    summary: `Fehler — ${input.error}`,
  };
  const lastRun: CollectionFlowLastRun = {
    startedAt: input.startedAt,
    completedAt: new Date().toISOString(),
    scanId: null,
    url: input.startUrl,
    status: 'error',
    overallScore: null,
    error: input.error,
    context: { outputs: input.runContext.outputs },
  };
  const saved = await persistFlowRunResult({
    platformProjectId: input.id,
    flowId: input.fid,
    verdict,
    lastRun,
  });
  if (input.historyRunId) {
    await patchCollectionFlowRun({
      runId: input.historyRunId,
      status: 'error',
      verdict,
      lastRun,
      error: input.error,
    });
  }
  return {
    ok: true,
    flow: saved ? toCollectionTestFlowResponse(saved) : null,
    verdict,
    lastRun,
    nodeStates: nodeStatesFromVerdict(input.doc, verdict, lastRun),
  };
}
