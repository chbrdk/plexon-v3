import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS } from '@/lib/integrations/domain-scan-poll-budget';
import { apiEventQuickCheckRun } from '@/lib/paths/event-quick-check-page';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import { eqcClientErrorMessage } from '@/components/event-quick-check/eqc-client-error';
import { readEqcJsonResponse } from '@/components/event-quick-check/read-eqc-json-response';

const POLL_MS = 5_000;
/** Align with server domain-scan hang ceiling (+ GEO headroom after crawl). */
const MAX_POLL_MS = DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS + 30 * 60 * 1000;
/** Transient wifi/DNS blips during long domain scans — don't abort the whole wait. */
const MAX_CONSECUTIVE_NETWORK_FAILURES = 8;

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

function isTransientPollFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message || '';
  return (
    /failed to fetch|networkerror|load failed|err_network|err_name_not_resolved|err_connection|err_invalid_handle/i.test(
      message
    ) ||
    message === EQC_PAGE_COPY.errorLoadRun ||
    message.startsWith('Serverfehler (5')
  );
}

/** Poll GET run until workflow leaves bare `running` (async confirm paths). */
export async function pollEventQuickCheckRunUntilSettled(
  workflowRunId: string
): Promise<EventQuickCheckRunPollResult> {
  const started = Date.now();
  let consecutiveNetworkFailures = 0;

  while (Date.now() - started < MAX_POLL_MS) {
    try {
      const res = await fetch(apiEventQuickCheckRun(workflowRunId), { credentials: 'same-origin' });
      if (!res.ok) {
        if (res.status >= 500) {
          throw new Error(`Serverfehler (${res.status})`);
        }
        throw new Error(EQC_PAGE_COPY.errorLoadRun);
      }

      consecutiveNetworkFailures = 0;

      const data = await readEqcJsonResponse<{
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
      }>(res);

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
    } catch (error) {
      if (isTransientPollFailure(error)) {
        consecutiveNetworkFailures += 1;
        if (consecutiveNetworkFailures >= MAX_CONSECUTIVE_NETWORK_FAILURES) {
          throw new Error(eqcClientErrorMessage(error, EQC_PAGE_COPY.errorNetwork));
        }
        await sleep(POLL_MS);
        continue;
      }
      throw error instanceof Error ? error : new Error(EQC_PAGE_COPY.errorLoadRun);
    }

    await sleep(POLL_MS);
  }

  throw new Error(
    'Quick Check Timeout — Analyse läuft noch im Hintergrund. Seite neu laden oder Run in der Historie öffnen.'
  );
}
