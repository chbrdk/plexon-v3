import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { apiEventQuickCheckRun } from '@/lib/paths/event-quick-check-page';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

const POLL_MS = 5_000;
const MAX_POLL_MS = 20 * 60 * 1000;

export type EventQuickCheckRunPollResult = {
  ok: boolean;
  report?: EventQuickCheckReportModel;
  steps?: WorkflowStep[];
  platformProjectId?: string;
  error?: string;
  awaitingCompetitors?: boolean;
  competitors?: string[];
  maxCompetitors?: number;
  awaitingGeoQuestions?: boolean;
  geoQuestions?: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  geoHasPersona?: boolean;
  awaitingDeepScan?: boolean;
  deepScanProgress?: DeepScanProgress;
  checkionProjectId?: string;
  canRerunGeo?: boolean;
  companyBrief?: EventQuickCheckCompanyBrief;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Poll GET run until workflow leaves bare `running` (async confirm paths). */
export async function pollEventQuickCheckRunUntilSettled(
  workflowRunId: string
): Promise<EventQuickCheckRunPollResult> {
  const started = Date.now();

  while (Date.now() - started < MAX_POLL_MS) {
    const res = await fetch(apiEventQuickCheckRun(workflowRunId), { credentials: 'same-origin' });
    if (!res.ok) {
      throw new Error(EQC_PAGE_COPY.errorLoadRun);
    }

    const data = (await res.json()) as {
      status?: string;
      report?: EventQuickCheckReportModel | null;
      steps?: WorkflowStep[];
      platformProjectId?: string;
      error?: string;
      awaitingCompetitors?: boolean;
      competitors?: string[];
      maxCompetitors?: number;
      awaitingGeoQuestions?: boolean;
      geoQuestions?: string[];
      geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
      geoHasPersona?: boolean;
      awaitingDeepScan?: boolean;
      deepScanProgress?: DeepScanProgress;
      checkionProjectId?: string;
      canRerunGeo?: boolean;
      companyBrief?: EventQuickCheckCompanyBrief;
    };

    if (data.awaitingCompetitors) {
      return {
        ok: true,
        awaitingCompetitors: true,
        competitors: data.competitors,
        maxCompetitors: data.maxCompetitors,
        steps: data.steps,
        platformProjectId: data.platformProjectId,
      };
    }

    if (data.awaitingGeoQuestions && data.geoQuestions?.length) {
      return {
        ok: true,
        awaitingGeoQuestions: true,
        geoQuestions: data.geoQuestions,
        geoQuestionsByPersona: data.geoQuestionsByPersona,
        geoHasPersona: data.geoHasPersona,
        deepScanProgress: data.deepScanProgress,
        checkionProjectId: data.checkionProjectId,
        steps: data.steps,
        platformProjectId: data.platformProjectId,
      };
    }

    if (data.awaitingDeepScan) {
      return {
        ok: true,
        awaitingDeepScan: true,
        deepScanProgress: data.deepScanProgress,
        checkionProjectId: data.checkionProjectId,
        steps: data.steps,
      };
    }

    if (data.status === 'failed') {
      return { ok: false, error: data.error ?? EQC_PAGE_COPY.errorRunFailed, steps: data.steps };
    }

    if (data.status === 'completed' && data.report) {
      return {
        ok: true,
        report: data.report,
        steps: data.steps,
        platformProjectId: data.platformProjectId,
        canRerunGeo: data.canRerunGeo,
      };
    }

    await sleep(POLL_MS);
  }

  throw new Error(
    'Quick Check Timeout — Analyse läuft noch im Hintergrund. Seite neu laden oder Run in der Historie öffnen.'
  );
}
