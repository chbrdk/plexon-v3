import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
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
  awaitingDeepScan?: boolean;
  deepScanProgress?: DeepScanProgress;
  checkionProjectId?: string;
  canRerunGeo?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Poll GET run until workflow leaves `running` (async GEO confirm path). */
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
      awaitingDeepScan?: boolean;
      deepScanProgress?: DeepScanProgress;
      checkionProjectId?: string;
      canRerunGeo?: boolean;
    };

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

  throw new Error('Quick Check Timeout — GEO läuft noch im Hintergrund. Seite neu laden oder Run in der Historie öffnen.');
}
