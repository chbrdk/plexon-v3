import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  executeEventQuickCheckRun,
  reportFromWorkflowRun,
} from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import {
  EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY,
  EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY,
  EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY,
  EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY,
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY,
} from '@/lib/paths/event-quick-check-page';
import { getAssistantWorkflowRunById, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import { resolveEventQuickCheckDeepScanStatus } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { canReopenEventQuickCheckGeo } from '@/lib/assistant/event-quick-check/resolve-geo-questions-reopen-draft';
import {
  hydrateEventQuickCheckReportDomainPages,
  resolveEqcDomainScanIdFromStored,
} from '@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { pathCheckionDomainScan } from '@/lib/paths/checkion-api';

function seedDomainFromCheckpoint(
  report: EventQuickCheckReportModel | null,
  checkpoint: EventQuickCheckResumeCheckpoint | undefined
): EventQuickCheckReportModel | null {
  if (!report || report.domain || !checkpoint?.domainScan) return report;
  const scan = checkpoint.domainScan;
  return {
    ...report,
    domain: {
      scanId: scan.id,
      domain: scan.domain,
      url: scan.url,
      status: scan.status,
      score: scan.score,
      totalPages: scan.totalPages,
      stats: scan.stats,
      topIssues: scan.topIssues,
      checkionHref: pathCheckionDomainScan({ url: scan.url, scanId: scan.id }),
    },
    appendix: {
      ...report.appendix,
      scanId: report.appendix.scanId || scan.id,
    },
  };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  const run = await getAssistantWorkflowRunById(runId);
  if (!run || !(await userCanAccessEventQuickCheckRun(user, run))) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const stored = (run.result ?? {}) as Record<string, unknown>;
  const awaitingGeoQuestions = Boolean(stored[EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]);
  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
    | EventQuickCheckResumeCheckpoint
    | undefined;
  const deepScan =
    awaitingGeoQuestions || Boolean(stored[EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY])
      ? await resolveEventQuickCheckDeepScanStatus(stored)
      : { deepScanStarted: false as const };

  const seeded = seedDomainFromCheckpoint(reportFromWorkflowRun(run), checkpoint);
  const fallbackScanId = resolveEqcDomainScanIdFromStored(stored);
  const report = await hydrateEventQuickCheckReportDomainPages(seeded, fallbackScanId);

  const before = seeded?.domain;
  const after = report?.domain;
  const improved =
    Boolean(report) &&
    Boolean(after) &&
    (before?.totalPages !== after?.totalPages ||
      before?.stats?.errors !== after?.stats?.errors ||
      before?.scanId !== after?.scanId);
  if (improved && report) {
    await updateAssistantWorkflowRun(run.id, {
      result: {
        ...stored,
        [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: report,
      },
    });
  }

  return Response.json({
    workflowRunId: run.id,
    status: run.status,
    steps: run.steps,
    url: stored.url,
    projectName: stored.projectName,
    platformProjectId: stored.platformProjectId,
    report,
    error: typeof stored.error === 'string' ? stored.error : undefined,
    awaitingCompanyBrief: Boolean(stored[EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]),
    companyBrief: stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY] ?? undefined,
    awaitingGeoQuestions,
    geoQuestions: stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY] ?? undefined,
    geoQuestionsByPersona:
      stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY] ?? undefined,
    geoHasPersona: listPersonasFromPreview(checkpoint?.personaPreview).length > 0,
    geoCompetitors: stored[EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY] ?? undefined,
    awaitingCompetitors: Boolean(stored[EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY]),
    competitors: stored[EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY] ?? undefined,
    awaitingDeepScan: Boolean(stored[EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY]),
    deepScanStarted: stored[EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY] ?? undefined,
    canRerunGeo: canReopenEventQuickCheckGeo(stored),
    ...(deepScan.deepScanStarted
      ? {
          deepScanProgress: deepScan.deepScanProgress,
          checkionProjectId: deepScan.checkionProjectId,
        }
      : {}),
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;

  try {
    const result = await executeEventQuickCheckRun({ user, workflowRunId: runId });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') return apiError('Not found', API_STATUS.NOT_FOUND);
      if (e.message === 'RUN_NOT_INITIALIZED') {
        return apiError('Run not initialized', API_STATUS.BAD_REQUEST);
      }
    }
    throw e;
  }
}
