'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { apiEventQuickCheckRunDeepScan } from '@/lib/paths/event-quick-check-page';

const POLL_MS = 15_000;

export type DeepScanPollState = {
  progress?: DeepScanProgress;
  allComplete: boolean;
  checkionProjectId?: string;
  loading: boolean;
};

export function useEventQuickCheckDeepScanPoll(
  workflowRunId: string | null,
  options?: {
    enabled?: boolean;
    initialProgress?: DeepScanProgress;
    initialCheckionProjectId?: string;
  }
): DeepScanPollState {
  const enabled = Boolean(workflowRunId && options?.enabled !== false);
  const [progress, setProgress] = useState<DeepScanProgress | undefined>(options?.initialProgress);
  const [allComplete, setAllComplete] = useState(false);
  const [checkionProjectId, setCheckionProjectId] = useState<string | undefined>(
    options?.initialCheckionProjectId
  );
  const [loading, setLoading] = useState(enabled && !options?.initialProgress);

  const poll = useCallback(async () => {
    if (!workflowRunId) return;
    try {
      const res = await fetch(apiEventQuickCheckRunDeepScan(workflowRunId), {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        progress?: DeepScanProgress;
        allComplete?: boolean;
        checkionProjectId?: string;
      };
      if (data.progress) setProgress(data.progress);
      if (typeof data.allComplete === 'boolean') setAllComplete(data.allComplete);
      if (data.checkionProjectId) setCheckionProjectId(data.checkionProjectId);
    } catch {
      /* retry on next tick */
    } finally {
      setLoading(false);
    }
  }, [workflowRunId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await poll();
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, poll]);

  return { progress, allComplete, checkionProjectId, loading };
}
