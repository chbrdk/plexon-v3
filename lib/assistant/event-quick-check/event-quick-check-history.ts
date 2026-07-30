import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page';
import type {
  StoredAssistantWorkflowRun,
  WorkflowRunStatus,
} from '@/lib/db/assistant-workflow-runs';
import { domainFromEventQuickCheckUrl } from '@/lib/assistant/event-quick-check/event-quick-check-url';

export type EventQuickCheckHistoryItem = {
  workflowRunId: string;
  url: string;
  projectName: string;
  domain: string;
  status: WorkflowRunStatus;
  createdAt: string;
  updatedAt: string;
  hasReport: boolean;
  domainScore?: number;
  platformProjectId?: string;
};

export function reportFromRunResult(
  result: Record<string, unknown> | null
): EventQuickCheckReportModel | null {
  const raw = result?.[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY];
  if (!raw || typeof raw !== 'object') return null;
  return raw as EventQuickCheckReportModel;
}

export function mapEventQuickCheckRunToHistoryItem(
  run: StoredAssistantWorkflowRun
): EventQuickCheckHistoryItem | null {
  const stored = run.result ?? {};
  const url = typeof stored.url === 'string' ? stored.url : undefined;
  if (!url) return null;

  const projectName =
    typeof stored.projectName === 'string'
      ? stored.projectName
      : domainFromEventQuickCheckUrl(url) ?? url;

  const report = reportFromRunResult(run.result);
  const domain = report?.meta.domain ?? domainFromEventQuickCheckUrl(url) ?? projectName;

  return {
    workflowRunId: run.id,
    url,
    projectName,
    domain,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    hasReport: Boolean(report),
    domainScore: report?.domain?.score,
    platformProjectId:
      typeof stored.platformProjectId === 'string'
        ? stored.platformProjectId
        : report?.meta.platformProjectId,
  };
}

export function eventQuickCheckHistoryStatusLabel(status: WorkflowRunStatus): string {
  switch (status) {
    case 'completed':
      return 'Abgeschlossen';
    case 'failed':
      return 'Fehlgeschlagen';
    case 'running':
      return 'Läuft';
    default:
      return 'Ausstehend';
  }
}
