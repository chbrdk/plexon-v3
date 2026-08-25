/**
 * Wave 23 — Event Quick Check spine on Collection Flow runtime.
 * @see specs/domain/eqc-as-collection-flow.md
 */

import { API_STATUS } from '@/lib/api-error-handler';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { researchCompanyBrief } from '@/lib/assistant/event-quick-check/research-company-brief';
import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import { geoPreviewForCatalogBundle } from '@/lib/assistant/event-quick-check/hydrate-geo-job-preview';
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
  resolveGeoJobMeasurementsFromContext,
  resolveGeoJobQueriesFromContext,
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
import { executeCheckionDomainScanCapability } from '@/lib/capabilities/executors/checkion-domain-scan';
import { executeCheckionGeoJobCapability } from '@/lib/capabilities/executors/checkion-geo-job';
import { isCapabilityCatalogRuntimeEnabled } from '@/lib/capabilities/runtime-flag';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import {
  fetchCheckionDomainScanV3Issues,
  runCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import { runCheckionGeoJobV3 } from '@/lib/integrations/checkion-geo-jobs-v3-client';
import { parseGeoMeasurement, parseGeoMeasurementsOrDefaultEqc, GEO_MEASUREMENT_DEFAULTS_EQC, type GeoMeasurement } from '@/lib/geo/measurement';
import { suggestCheckionProjectCompetitors } from '@/lib/integrations/checkion-project-competitors-client';
import {
  parseEventQuickCheckProfileOverrides,
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
  /** Persist CHECKION scan id as soon as known (before long poll). */
  onDomainScanStarted?: (scan: { id: string; status: string; url?: string }) => void | Promise<void>;
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
  const profile = resolveEventQuickCheckProfile(depth, parseEventQuickCheckProfileOverrides(body));
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
      const measurements = parseGeoMeasurementsOrDefaultEqc(body.measurements);
      const bundle = buildQueriesCatalogBundle(body.payload as string[], { measurements });
      const suggestId = doc.nodes.find((n) => n.kind === 'suggest_queries')?.id;
      runContext = setContextBundle(runContext, root, bundle, suggestId);
    }
  }

  const checkionProjectId = await getExternalProjectId(id, 'checkion');
  const audionProjectId = await getExternalProjectId(id, 'audion');

  const requireCheckion = async (reason: string) => {
    if (checkionProjectId) return checkionProjectId;
    return failEqc({
      id,
      fid,
      doc,
      startedAt,
      startUrl,
      runContext,
      error: `CHECKION-Bindung fehlt (${reason}) — Collection-Bootstrap prüfen.`,
      historyRunId: input.historyRunId,
    });
  };

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
      const boundCheckion = await requireCheckion('Wettbewerber');
      if (typeof boundCheckion !== 'string') return boundCheckion;
      const suggested = await suggestCheckionProjectCompetitors({
        projectId: boundCheckion,
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
      const boundCheckion = await requireCheckion('Domain-Scan');
      if (typeof boundCheckion !== 'string') return boundCheckion;
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
      const maxPages =
        typeof qualityNode.maxPages === 'number' ? qualityNode.maxPages : profile.scanMaxPages;

      const preferDomainScanId =
        (typeof body.preferDomainScanId === 'string' && body.preferDomainScanId.trim()) ||
        (typeof runContext.outputs.domain?.scanId === 'string' &&
          String(runContext.outputs.domain.scanId).trim()) ||
        '';

      let domainScan: {
        id: string;
        status: string;
        overallScore: number | null;
        pageCount?: number | null;
        url?: string;
      } | null = null;
      let domainError: string | undefined;

      const onStarted = async (scan: {
        id: string;
        status: string;
        url?: string;
      }) => {
        await input.onDomainScanStarted?.(scan);
      };

      if (isCapabilityCatalogRuntimeEnabled()) {
        const cap = await executeCheckionDomainScanCapability(
          {
            url: scanUrl,
            maxPages,
            ...(preferDomainScanId ? { existingScanId: preferDomainScanId } : {}),
            onStarted,
          },
          {
            source: 'flow',
            checkionProjectId: boundCheckion,
            platformProjectId: id,
            nodeId: node.id,
          }
        );
        const flowScan =
          cap.agentPayload?.variant === 'flow' ? cap.agentPayload.scan : undefined;
        if (!cap.ok || !flowScan) {
          domainError = cap.error ?? 'Domain-Scan fehlgeschlagen';
        } else {
          domainScan = flowScan;
        }
      } else {
        const domainResult = await runCheckionDomainScanV3({
          projectId: boundCheckion,
          url: scanUrl,
          maxPages,
          ...(preferDomainScanId ? { existingScanId: preferDomainScanId } : {}),
          onStarted,
        });
        if (!domainResult.ok) {
          domainError = domainResult.error;
        } else {
          domainScan = domainResult.scan;
        }
      }

      if (!domainScan) {
        return failEqc({
          id,
          fid,
          doc,
          startedAt,
          startUrl,
          runContext,
          error: domainError ?? 'Domain-Scan fehlgeschlagen',
          historyRunId: input.historyRunId,
        });
      }
      domainScanId = domainScan.id;
      overallScore = domainScan.overallScore;
      const issuesRes = await fetchCheckionDomainScanV3Issues(domainScan.id);
      runContext = setContextBundle(
        runContext,
        'domain',
        buildDomainCatalogBundle({
          status: domainScan.status,
          overallScore: domainScan.overallScore,
          pageCount: domainScan.pageCount ?? null,
          scanId: domainScan.id,
          url: domainScan.url || scanUrl,
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
      if (step.personaOutcome?.status === 'error') {
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
          personas: personas.map((p) => ({
            id: p.id,
            name: p.name,
            segment: p.segment,
            confidence: p.confidence,
            headline: p.headline,
            ...(p.profile ? { profile: p.profile } : {}),
            ...(p.targetGroupId ? { targetGroupId: p.targetGroupId } : {}),
            ...(p.targetGroupName ? { targetGroupName: p.targetGroupName } : {}),
          })),
          targetGroups: step.personaPreview?.targetGroups?.map((g) => ({
            id: g.id,
            name: g.name,
            segment: g.segment,
          })),
          geoByPersona: step.geoQuestionsByPersona?.map((g) => ({
            personaId: g.personaId,
            personaName: g.personaName,
            segment: g.segment,
            questions: g.questions,
          })),
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
      const boundCheckion = await requireCheckion('GEO');
      if (typeof boundCheckion !== 'string') return boundCheckion;
      const geoNode = geoJobNode(resolvedNodes) ?? resolved;
      const queries = resolveGeoJobQueriesFromContext(runContext, geoNode.text);
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
      const geoUrl = chain.geoUrl || scanUrl || startUrl || undefined;
      const measurements = resolveGeoJobMeasurementsFromContext(
        runContext,
        GEO_MEASUREMENT_DEFAULTS_EQC
      ) as GeoMeasurement[];

      type GeoLayerOutcome = {
        measurement: GeoMeasurement;
        job: {
          id: string;
          status: string;
          citedShare?: number | null;
          geoFitness?: number | null;
          overallScore?: number | null;
          url?: string;
        };
        preview?: Parameters<typeof geoPreviewForCatalogBundle>[0];
        catalog?: Record<string, unknown>;
      };

      const runGeoLayer = async (
        measurement: GeoMeasurement,
        includePageScan: boolean
      ): Promise<GeoLayerOutcome | { measurement: GeoMeasurement; error: string }> => {
        if (isCapabilityCatalogRuntimeEnabled()) {
          const cap = await executeCheckionGeoJobCapability(
            {
              url: geoUrl,
              companyName: companyName || undefined,
              queries,
              includePageScan,
              measurement,
            },
            {
              source: 'flow',
              checkionProjectId: boundCheckion,
              platformProjectId: id,
              nodeId: node.id,
            }
          );
          if (!cap.ok || !cap.agentPayload?.job) {
            return { measurement, error: cap.error ?? 'GEO fehlgeschlagen' };
          }
          return {
            measurement,
            job: cap.agentPayload.job,
            preview: cap.agentPayload.preview,
            catalog: cap.catalogBundle,
          };
        }

        const geoResult = await runCheckionGeoJobV3({
          projectId: boundCheckion,
          platformProjectId: id,
          url: geoUrl,
          companyName: companyName || undefined,
          queries: queries.length ? queries : undefined,
          includePageScan,
          measurement,
        });
        if (!geoResult.ok) {
          return { measurement, error: geoResult.error };
        }
        return {
          measurement,
          job: geoResult.job,
          preview: geoResult.preview,
        };
      };

      const layerOutcomes = await Promise.all(
        measurements.map((measurement, index) => runGeoLayer(measurement, index === 0))
      );

      const layers: GeoLayerOutcome[] = [];
      for (const outcome of layerOutcomes) {
        if ('error' in outcome) {
          return failEqc({
            id,
            fid,
            doc,
            startedAt,
            startUrl,
            runContext,
            error: outcome.error ?? `GEO fehlgeschlagen (${outcome.measurement})`,
            historyRunId: input.historyRunId,
          });
        }
        layers.push(outcome);
      }

      const primary = layers[0]!;
      geoJobId = primary.job.id;
      citedShare = primary.job.citedShare ?? null;
      geoFitness = primary.job.geoFitness ?? null;
      if (primary.job.overallScore != null) overallScore = primary.job.overallScore;
      runContext = setContextBundle(
        runContext,
        'geo',
        buildGeoCatalogBundle({
          status: primary.job.status,
          citedShare,
          geoFitness,
          overallScore: primary.job.overallScore ?? null,
          url: primary.job.url || scanUrl || startUrl,
          measurement: parseGeoMeasurement(primary.measurement),
          jobId: primary.job.id,
          preview: primary.preview ? geoPreviewForCatalogBundle(primary.preview) : null,
          layers: layers.map((layer) => ({
            measurement: layer.measurement,
            jobId: layer.job.id,
            status: layer.job.status,
            citedShare: layer.job.citedShare ?? null,
            geoFitness: layer.job.geoFitness ?? null,
            overallScore: layer.job.overallScore ?? null,
            url: layer.job.url || scanUrl || startUrl,
            preview: layer.preview ? geoPreviewForCatalogBundle(layer.preview) : null,
          })),
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
