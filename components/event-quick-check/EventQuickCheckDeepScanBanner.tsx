'use client';

import { Button, Text } from '@msqdx/ui';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { pathCheckionProject } from '@/lib/paths/checkion-api';
import { useEventQuickCheckDeepScanPoll } from '@/components/event-quick-check/use-event-quick-check-deep-scan-poll';

type Props = {
  workflowRunId: string;
  initialProgress?: DeepScanProgress;
  checkionProjectId?: string;
};

export function EventQuickCheckDeepScanBanner({
  workflowRunId,
  initialProgress,
  checkionProjectId: initialCheckionProjectId,
}: Props) {
  const { progress, allComplete, checkionProjectId, loading } = useEventQuickCheckDeepScanPoll(
    workflowRunId,
    {
      enabled: true,
      initialProgress,
      initialCheckionProjectId,
    }
  );

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.complete / progress.total) * 100)
      : 0;
  const projectId = checkionProjectId ?? initialCheckionProjectId;
  const detail =
    loading && !progress
      ? EQC_PAGE_COPY.deepScanWaitingProgressUnknown
      : (progress?.detail ?? EQC_PAGE_COPY.deepScanWaitingProgressUnknown);

  return (
    <div
      className={`ds-alert ds-alert--${allComplete ? 'ok' : 'info'} plexon-eqc-alert-banner`}
      role="status"
    >
      <div className="plexon-eqc-stack-sm">
        <div>
          <Text role="label" as="p">
            {allComplete
              ? EQC_PAGE_COPY.deepScanBannerCompleteTitle
              : EQC_PAGE_COPY.deepScanBannerTitle}
          </Text>
          <Text role="body">
            {allComplete
              ? EQC_PAGE_COPY.deepScanBannerCompleteLead
              : EQC_PAGE_COPY.deepScanBannerLead}
          </Text>
        </div>
        {!allComplete ? (
          <div>
            <div className="plexon-eqc-row-between">
              <Text role="hint">{detail}</Text>
              <Text role="hint">{pct}%</Text>
            </div>
            <div
              className="plexon-eqc-progress"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="plexon-eqc-progress-bar" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}
        {projectId ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(pathCheckionProject(projectId), '_blank', 'noopener,noreferrer')
              }
            >
              {EQC_PAGE_COPY.openCheckionProjectButton}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
