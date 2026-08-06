/**
 * Shared Collection Test Flow executor (UI sync run + Wave 15 webhook worker).
 * @see specs/domain/collection-test-flow.md — Wave 15
 */

import { API_STATUS } from '@/lib/api-error-handler';
import {
  deriveCollectionVerdict,
  deriveJourneyErrorVerdict,
  documentHasGeoGate,
  documentHasGeoJob,
  documentHasIssueGate,
  documentHasJourneySegment,
  geoGateNode,
  geoJobNode,
  geoJobQueriesFromText,
  issueGateNode,
  listJourneyPersonaSlots,
  nodeStatesFromVerdict,
  qualityScanNode,
  resolveJourneyFlowForRun,
  resolveScoreForGate,
  scanNodeUrl,
  scoreGateNode,
  scoreGateThreshold,
  startNodeUrl,
  type CollectionFlowLastRun,
  type CollectionFlowNodeRunState,
  type CollectionFlowScanMode,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
  type GeoGateSignals,
  type IssueGateSignals,
} from '@/lib/collection-test-flow';
import {
  persistFlowRunResult,
  toCollectionTestFlowResponse,
  type CollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import { runAudionJourneySegment, rollupCollectionVerdictToAudionWave } from '@/lib/integrations/audion-journey-client';
import {
  fetchCheckionScanIssues,
  fetchCheckionScanScores,
  runCheckionSingleScan,
  type CheckionIssueItem,
} from '@/lib/integrations/checkion-scans-client';
import {
  fetchCheckionDomainScanV3Issues,
  runCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import { runCheckionGeoJobV3 } from '@/lib/integrations/checkion-geo-jobs-v3-client';
import {
  buildDomainCatalogBundle,
  buildGeoCatalogBundle,
  buildJourneyCatalogBundle,
  buildScanCatalogBundle,
  emptyRunContext,
  evaluateAllCompares,
  applySetNodes,
  setContextBundle,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import { distillCollectionFlowToKnowledgePack } from '@/lib/collection-flow-knowledge-distillate';

export type ExecuteCollectionFlowRunSuccess = {
  ok: true;
  flow: CollectionTestFlowResponse | null;
  verdict: CollectionVerdict;
  lastRun: CollectionFlowLastRun;
  nodeStates: Record<string, CollectionFlowNodeRunState>;
};

export type ExecuteCollectionFlowRunFailure = {
  ok: false;
  status: number;
  message: string;
};

export type ExecuteCollectionFlowRunResult =
  | ExecuteCollectionFlowRunSuccess
  | ExecuteCollectionFlowRunFailure;

export async function executeCollectionFlowRun(input: {
  platformProjectId: string;
  flowId: string;
  flowName: string;
  doc: CollectionTestFlowDocument;
  body: Record<string, unknown>;
  updatedByUserId?: string | null;
}): Promise<ExecuteCollectionFlowRunResult> {
  try {
    const id = input.platformProjectId;
    const fid = input.flowId;
    const row = { name: input.flowName };
    const doc = input.doc;
    const body = input.body;

    const urlOverride =
      typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null;
    const geoNode = geoJobNode(doc.nodes);
    const qualityNode = qualityScanNode(doc.nodes);
    const hasPageQuality = Boolean(qualityNode);
    const hasGeo = documentHasGeoJob(doc);
    const geoCompany =
      (typeof body.companyName === 'string' && body.companyName.trim()
        ? body.companyName.trim()
        : null) ||
      geoNode?.companyName?.trim() ||
      '';
    const baseUrl =
      urlOverride ??
      scanNodeUrl(doc.nodes) ??
      (geoNode?.url?.trim() || null) ??
      startNodeUrl(doc.nodes);

    if (!hasPageQuality && !hasGeo) {
      return { ok: false as const, status: API_STATUS.BAD_REQUEST, message: 'Quality path missing — add scan, domain_scan, or geo_job' };
    }
    if (!baseUrl && !geoCompany) {
      return { ok: false as const, status: API_STATUS.BAD_REQUEST, message: 'Scan URL missing — set domain, geo url/companyName, or pass url' };
    }
    if (documentHasJourneySegment(doc) && !baseUrl) {
      return { ok: false as const, status: API_STATUS.BAD_REQUEST, message: 'Journey requires a start/scan URL' };
    }

    const checkionProjectId = await getExternalProjectId(id, 'checkion');
    if (!checkionProjectId) {
      return { ok: false as const, status: API_STATUS.BAD_REQUEST, message: 'CHECKION binding missing — bind a Checkion project on this Collection' };
    }

    const hasJourney = documentHasJourneySegment(doc);
    const startedAt = new Date().toISOString();
    const threshold = scoreGateThreshold(doc.nodes);
    const runUrl = baseUrl || '';
    let runContext: CollectionFlowRunContext = setContextBundle(
      emptyRunContext(),
      'run',
      { url: runUrl, startedAt }
    );

    let audionJobId: string | null = null;
    let audionStudyId: string | null = null;
    let audionWaveId: string | null = null;
    let stepUrl: string | null = null;
    let scanUrl = runUrl;
    let taskCompleted = !hasJourney;
    let journeyValidEvidence = !hasJourney;
    let journeyPersonaRuns: NonNullable<CollectionFlowLastRun['journeyPersonaRuns']> | null = null;
    let journeyPersonaCount = 1;

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
      if (typeof body.personaCount === 'number' && Number.isFinite(body.personaCount)) {
        journeyPersonaCount = Math.max(1, Math.floor(body.personaCount));
      }
      if (Array.isArray(body.journeyPersonaRuns)) {
        journeyPersonaRuns = body.journeyPersonaRuns as NonNullable<
          CollectionFlowLastRun['journeyPersonaRuns']
        >;
      }
      if (stepUrl) scanUrl = stepUrl;
    } else if (hasJourney) {
      const audionProjectId = await getExternalProjectId(id, 'audion');
      if (!audionProjectId) {
        return { ok: false as const, status: API_STATUS.BAD_REQUEST, message: 'AUDION binding missing — bind an Audion project on this Collection' };
      }

      const slots = listJourneyPersonaSlots(doc);
      const runSlots =
        slots.length > 0
          ? slots
          : [
              {
                nodeId: '',
                personaId: null,
                personaName: null,
                segment: null,
                via: 'orphan' as const,
                primary: true,
              },
            ];

      const personaRuns: NonNullable<CollectionFlowLastRun['journeyPersonaRuns']> = [];
      let allTask = true;
      let allEvidence = true;
      let primaryStepUrl: string | null = null;

      for (const slot of runSlots) {
        const journeyFlow = resolveJourneyFlowForRun(doc, runUrl, {
          personaNodeId: slot.nodeId || null,
        });
        if (!journeyFlow) {
          return { ok: false as const, status: API_STATUS.BAD_REQUEST, message: 'Journey flow missing on document' };
        }
        const label = slot.personaName || slot.personaId || 'journey';
        const journey = await runAudionJourneySegment({
          projectId: audionProjectId,
          flow: journeyFlow,
          name: `${row.name} · ${label}`,
        });

        personaRuns.push({
          personaNodeId: slot.nodeId || 'start',
          personaId: slot.personaId,
          personaName: slot.personaName,
          jobId: journey.jobId ?? journey.job?.jobId ?? null,
          studyId: journey.studyId ?? null,
          waveId: journey.waveId ?? null,
          taskCompleted: journey.job?.taskCompleted ?? false,
          validEvidence: journey.job?.validEvidence ?? false,
          finalUrl: journey.job?.finalUrl ?? null,
          error: journey.ok ? null : journey.error,
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
            url: runUrl,
            status: 'error',
            overallScore: null,
            error: journey.error,
            audionJobId,
            audionStudyId,
            audionWaveId,
            stepUrl,
            journeyPersonaRuns: personaRuns,
            context: {
              outputs: setContextBundle(
                runContext,
                'journey',
                buildJourneyCatalogBundle({
                  taskCompleted: false,
                  validEvidence: false,
                  finalUrl: stepUrl,
                  personaCount: runSlots.length,
                })
              ).outputs,
            },
          };
          const saved = await persistFlowRunResult({
            platformProjectId: id,
            flowId: fid,
            verdict,
            lastRun,
          });
          return { ok: true as const,
            flow: saved ? toCollectionTestFlowResponse(saved) : null,
            verdict,
            lastRun,
            nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
          };
        }

        allTask = allTask && journey.job.taskCompleted;
        allEvidence = allEvidence && journey.job.validEvidence;
        if (slot.primary || !primaryStepUrl) {
          primaryStepUrl = journey.job.finalUrl;
          audionStudyId = journey.studyId;
          audionWaveId = journey.waveId;
          audionJobId = journey.jobId;
        }
        if (journey.job.finalUrl) stepUrl = journey.job.finalUrl;
      }

      taskCompleted = allTask;
      journeyValidEvidence = allEvidence;
      if (primaryStepUrl) stepUrl = primaryStepUrl;
      if (stepUrl) scanUrl = stepUrl;
      journeyPersonaRuns = personaRuns;
      journeyPersonaCount = runSlots.length;
    }

    if (hasJourney) {
      runContext = setContextBundle(
        runContext,
        'journey',
        buildJourneyCatalogBundle({
          taskCompleted,
          validEvidence: journeyValidEvidence,
          finalUrl: stepUrl,
          personaCount: journeyPersonaCount,
        })
      );
      for (const run of journeyPersonaRuns ?? []) {
        runContext = setContextBundle(
          runContext,
          run.personaNodeId,
          {
            taskCompleted: run.taskCompleted,
            validEvidence: run.validEvidence,
            finalUrl: run.finalUrl,
            personaId: run.personaId,
            personaName: run.personaName,
          },
          run.personaNodeId
        );
      }
    }

    // qualityNode already resolved above (Wave 8B may be geo-only)
    const useDomain = qualityNode?.kind === 'domain_scan';
    const pageScanMode: CollectionFlowScanMode =
      qualityNode?.scanMode === 'deep' ? 'deep' : 'single';
    const scoreGate = scoreGateNode(doc.nodes);
    const geoGate = geoGateNode(doc.nodes);
    const hasCompare = doc.nodes.some((n) => n.kind === 'compare');
    const needGeoFitness =
      (!hasCompare &&
        documentHasGeoGate(doc) &&
        (geoGate?.gateCondition === 'geo_fitness_at_least' ||
          geoGate?.gateCondition === 'geo_fitness_below')) ||
      (hasCompare &&
        doc.nodes.some(
          (n) => n.kind === 'compare' && (n.path ?? '').startsWith('geo.geoFitness')
        ));

    type QualityResult = {
      ok: boolean;
      error?: string;
      id: string | null;
      status: string;
      overallScore: number | null;
      url: string;
      scanError?: string | null;
      domainScanId?: string | null;
      scanMode: CollectionFlowScanMode | 'domain' | null;
      pageScanId?: string | null;
    };

    const blockers: string[] = [];
    let quality: QualityResult | null = null;

    if (hasPageQuality) {
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
          geoGate,
          requirePageScore: Boolean(scoreGate) || !hasGeo,
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
          url: scanUrl || runUrl,
          status: quality.status,
          overallScore: quality.overallScore,
          error: quality.error ?? null,
          audionJobId,
          audionStudyId,
          audionWaveId,
          stepUrl: stepUrl ?? (scanUrl || runUrl),
        };
        const saved = await persistFlowRunResult({
          platformProjectId: id,
          flowId: fid,
          verdict: errorVerdict,
          lastRun,
        });
        return { ok: true as const,
          flow: saved ? toCollectionTestFlowResponse(saved) : null,
          verdict: errorVerdict,
          lastRun,
          nodeStates: nodeStatesFromVerdict(doc, errorVerdict, lastRun),
        };
      }

      if (quality.scanError) blockers.push(quality.scanError);
    }

    // Always materialize issue + score catalog for page/domain actions (Wave 9 compare).
    const hasIssues = documentHasIssueGate(doc);
    const gate = issueGateNode(doc.nodes);
    let issueSignals: IssueGateSignals | null = null;
    let issueItems: CheckionIssueItem[] = [];
    let scoresByKind: Record<string, number> | null = null;
    if (quality?.id) {
      if (useDomain) {
        const issuesRes = await fetchCheckionDomainScanV3Issues(quality.id);
        if (!issuesRes.ok) {
          if (hasIssues || hasCompare) blockers.push(issuesRes.error);
        } else issueSignals = issuesRes.signals;
      } else {
        const issuesRes = await fetchCheckionScanIssues(quality.id);
        if (!issuesRes.ok) {
          if (hasIssues || hasCompare) blockers.push(issuesRes.error);
        } else {
          issueSignals = issuesRes.signals;
          issueItems = issuesRes.items;
        }
        if (quality.pageScanId) {
          const scoresRes = await fetchCheckionScanScores(quality.pageScanId);
          if (scoresRes.ok) scoresByKind = scoresRes.byKind;
          else if (hasCompare) blockers.push(scoresRes.error);
        }
      }
    }

    let gatedScore: number | null | undefined = undefined;
    const scoreKind = (scoreGate?.scoreKind ?? 'overall').trim().toLowerCase() || 'overall';
    if (quality) {
      gatedScore = resolveScoreForGate(scoreGate, quality.overallScore, scoresByKind);
      if (useDomain) {
        runContext = setContextBundle(
          runContext,
          'domain',
          buildDomainCatalogBundle({
            status: quality.status,
            overallScore: quality.overallScore,
            pageCount: null,
            issues: issueSignals,
            issueItems,
          }),
          qualityNode?.id
        );
      } else {
        runContext = setContextBundle(
          runContext,
          'scan',
          buildScanCatalogBundle({
            status: quality.status,
            overallScore: quality.overallScore,
            url: quality.url || scanUrl,
            scoresByKind,
            issues: issueSignals,
            issueItems,
          }),
          qualityNode?.id
        );
      }
    }

    let geoJobId: string | null = null;
    let geoSignals: GeoGateSignals | null = null;
    let geoCitedShare: number | null = null;
    let geoFitnessVal: number | null = null;
    let geoStatus: string | null = null;
    let geoOverall: number | null = null;
    let geoUrl = quality?.url || scanUrl || runUrl;

    if (hasGeo) {
      const queries = geoJobQueriesFromText(geoNode?.text);
      const geoResult = await runCheckionGeoJobV3({
        projectId: checkionProjectId,
        platformProjectId: id,
        url: geoNode?.url?.trim() || scanUrl || runUrl || undefined,
        companyName: geoCompany || undefined,
        queries: queries.length ? queries : undefined,
        includePageScan: needGeoFitness && !hasPageQuality,
      });
      if (!geoResult.ok) {
        blockers.push(geoResult.error);
        geoJobId = geoResult.job?.id ?? null;
        geoStatus = geoResult.job?.status ?? 'failed';
        geoCitedShare = geoResult.job?.citedShare ?? null;
        geoFitnessVal = geoResult.job?.geoFitness ?? null;
        geoOverall = geoResult.job?.overallScore ?? null;
        if (geoResult.job?.url) geoUrl = geoResult.job.url;
        if (geoResult.job) {
          runContext = setContextBundle(
            runContext,
            'geo',
            buildGeoCatalogBundle({
              status: geoStatus,
              citedShare: geoCitedShare,
              geoFitness: geoFitnessVal,
              overallScore: geoOverall,
              url: geoUrl,
            }),
            geoNode?.id
          );
        }
        const compareResults = evaluateAllCompares(
          doc.nodes,
          applySetNodes(doc.nodes, runContext)
        ).map((r) => ({
          nodeId: r.nodeId,
          path: r.path,
          passed: r.passed,
          actual: r.actual ?? null,
        }));
        const verdictBase = deriveCollectionVerdict({
          scanStatus: geoStatus,
          overallScore: quality?.overallScore ?? geoOverall,
          gatedScore: quality ? gatedScore : geoOverall,
          threshold,
          blockers,
          hasJourneySegment: hasJourney,
          taskCompleted,
          journeyValidEvidence,
          scoreGate: hasCompare ? null : scoreGate,
          issueGate: hasCompare ? null : gate,
          issueSignals,
          geoGate: hasCompare ? null : geoGate,
          geoSignals: null,
          compareResults: hasCompare ? compareResults : null,
          requirePageScore: hasPageQuality,
        });
        const errorVerdict: CollectionVerdict = {
          ...verdictBase,
          status: 'error',
          flowCompleted: false,
          collectionReady: false,
          pageEvidenceValid: false,
          pageEvidenceCaveat: geoResult.error,
          summary: `Fehler — ${geoResult.error}`,
          blockers,
        };
        const lastRun: CollectionFlowLastRun = {
          startedAt,
          completedAt: new Date().toISOString(),
          scanId: quality?.pageScanId ?? null,
          domainScanId: quality?.domainScanId ?? null,
          geoJobId,
          scanMode: quality?.scanMode ?? null,
          scoreKind: scoreKind !== 'overall' ? scoreKind : null,
          url: geoUrl,
          status: geoStatus,
          overallScore: quality?.overallScore ?? geoOverall,
          citedShare: geoCitedShare,
          geoFitness: geoFitnessVal,
          error: geoResult.error,
          audionJobId,
          audionStudyId,
          audionWaveId,
          stepUrl: stepUrl ?? geoUrl,
          issueCount: issueSignals?.issueCount ?? null,
          criticalCount: issueSignals?.criticalCount ?? null,
          context: runContext,
          compareResults,
        };
        const saved = await persistFlowRunResult({
          platformProjectId: id,
          flowId: fid,
          verdict: errorVerdict,
          lastRun,
        });
        return { ok: true as const,
          flow: saved ? toCollectionTestFlowResponse(saved) : null,
          verdict: errorVerdict,
          lastRun,
          nodeStates: nodeStatesFromVerdict(doc, errorVerdict, lastRun),
        };
      }

      geoJobId = geoResult.job.id;
      geoSignals = geoResult.signals;
      geoCitedShare = geoResult.signals.citedShare;
      geoFitnessVal = geoResult.signals.geoFitness;
      geoStatus = geoResult.job.status;
      geoOverall = geoResult.job.overallScore;
      if (geoResult.job.url) geoUrl = geoResult.job.url;
      runContext = setContextBundle(
        runContext,
        'geo',
        buildGeoCatalogBundle({
          status: geoStatus,
          citedShare: geoCitedShare,
          geoFitness: geoFitnessVal,
          overallScore: geoOverall,
          url: geoUrl,
        }),
        geoNode?.id
      );
    }

    runContext = applySetNodes(doc.nodes, runContext);
    const compareEvals = evaluateAllCompares(doc.nodes, runContext);
    const compareResults = compareEvals.map((r) => ({
      nodeId: r.nodeId,
      path: r.path,
      passed: r.passed,
      actual: r.actual ?? null,
    }));

    const terminalStatus = quality?.status ?? geoStatus ?? 'completed';
    const overallForVerdict = quality?.overallScore ?? geoOverall;
    const verdict = deriveCollectionVerdict({
      scanStatus: terminalStatus,
      overallScore: overallForVerdict,
      gatedScore: quality ? gatedScore : geoOverall ?? geoCitedShare,
      threshold,
      blockers,
      hasJourneySegment: hasJourney,
      taskCompleted,
      journeyValidEvidence,
      scoreGate: hasCompare ? null : scoreGate,
      issueGate: hasCompare ? null : gate,
      issueSignals,
      geoGate: hasCompare ? null : geoGate,
      geoSignals,
      compareResults: hasCompare ? compareResults : null,
      requirePageScore: hasPageQuality,
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
        scanId: quality?.pageScanId ?? quality?.id ?? geoJobId,
        stepUrl: stepUrl ?? quality?.url ?? geoUrl,
        overallScore: overallForVerdict,
      });
      waveEvaluateOk = rollup.waveEvaluateOk;
      waveRollupOk = rollup.ok && rollup.waveRollupOk;
    }

    const distillate = await distillCollectionFlowToKnowledgePack({
      platformProjectId: id,
      flowId: fid,
      verdict,
      scanId: quality?.pageScanId ?? quality?.id ?? geoJobId,
      overallScore: overallForVerdict,
      updatedByUserId: input.updatedByUserId ?? null,
    });
    knowledgeDistillateOk = distillate.ok;

    const lastRun: CollectionFlowLastRun = {
      startedAt,
      completedAt: new Date().toISOString(),
      scanId: quality?.pageScanId ?? null,
      domainScanId: quality?.domainScanId ?? null,
      geoJobId,
      scanMode: quality?.scanMode ?? null,
      scoreKind: scoreKind !== 'overall' ? scoreKind : null,
      url: quality?.url || geoUrl,
      status: terminalStatus,
      overallScore: overallForVerdict,
      citedShare: geoCitedShare,
      geoFitness: geoFitnessVal,
      error: quality?.scanError ?? null,
      audionJobId,
      audionStudyId,
      audionWaveId,
      stepUrl: stepUrl ?? quality?.url ?? geoUrl,
      issueCount: issueSignals?.issueCount ?? null,
      criticalCount: issueSignals?.criticalCount ?? null,
      issueGateBranch: verdict.issueGateBranch,
      waveEvaluateOk,
      waveRollupOk,
      knowledgeDistillateOk,
      context: runContext,
      compareResults,
      journeyPersonaRuns,
    };

    const saved = await persistFlowRunResult({
      platformProjectId: id,
      flowId: fid,
      verdict,
      lastRun,
    });

    return { ok: true as const,
      flow: saved ? toCollectionTestFlowResponse(saved) : null,
      verdict,
      lastRun,
      nodeStates: nodeStatesFromVerdict(doc, verdict, lastRun),
    };

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Flow run failed';
    return { ok: false as const, status: API_STATUS.INTERNAL_ERROR, message };
  }
}
