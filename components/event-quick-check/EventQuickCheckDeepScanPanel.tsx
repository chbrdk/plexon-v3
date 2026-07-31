'use client';

import { useEffect, useRef } from 'react';
import { Alert, Button, Spinner, Text } from '@msqdx/ui';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { pathCheckionProject } from '@/lib/paths/checkion-api';
import { useEventQuickCheckDeepScanPoll } from '@/components/event-quick-check/use-event-quick-check-deep-scan-poll';

type Props = {
  workflowRunId: string;
  checkionProjectId?: string;
  initialProgress?: DeepScanProgress;
  loading: boolean;
  onContinue: () => void;
  onProgress: (progress: DeepScanProgress) => void;
};

function DeepScanProgressBar({ pct, detail }: { pct: number; detail: string }) {
  return (
    <div>
      <div className="plexon-eqc-row-between">
        <Text role="meta">{detail}</Text>
        <Text role="meta">{pct}%</Text>
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
  );
}

export function EventQuickCheckDeepScanPanel({
  workflowRunId,
  checkionProjectId: initialCheckionProjectId,
  initialProgress,
  loading,
  onContinue,
  onProgress,
}: Props) {
  const continueTriggered = useRef(false);
  const { progress, allComplete, checkionProjectId } = useEventQuickCheckDeepScanPoll(workflowRunId, {
    initialProgress,
    initialCheckionProjectId,
  });

  useEffect(() => {
    if (progress) onProgress(progress);
  }, [progress, onProgress]);

  useEffect(() => {
    if (allComplete && !continueTriggered.current && !loading) {
      continueTriggered.current = true;
      onContinue();
    }
  }, [allComplete, loading, onContinue]);

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.complete / progress.total) * 100)
      : 0;
  const projectId = checkionProjectId ?? initialCheckionProjectId;
  const detail = progress?.detail ?? EQC_PAGE_COPY.deepScanWaitingProgressUnknown;

  return (
    <div className="plexon-eqc-stack">
      <Text role="headline" as="h2">
        {EQC_PAGE_COPY.deepScanWaitingTitle}
      </Text>
      <Text role="body">{EQC_PAGE_COPY.deepScanWaitingLead}</Text>
      <Alert tone="info">{EQC_PAGE_COPY.deepScanWaitingHint}</Alert>
      <DeepScanProgressBar pct={pct} detail={detail} />
      {loading ? (
        <div className="plexon-eqc-row">
          <Spinner size="sm" />
          <Text role="body">{EQC_PAGE_COPY.deepScanWaitingContinuing}</Text>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={onContinue}
          disabled={!progress || progress.complete < progress.total}
        >
          {EQC_PAGE_COPY.deepScanWaitingContinue}
        </Button>
      )}
      {projectId ? (
        <Button
          variant="ghost"
          onClick={() =>
            window.open(pathCheckionProject(projectId), '_blank', 'noopener,noreferrer')
          }
        >
          {EQC_PAGE_COPY.openCheckionProjectButton}
        </Button>
      ) : null}
    </div>
  );
}
