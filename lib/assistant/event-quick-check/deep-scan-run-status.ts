import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import { resolveDeepScanForQuickCheck } from '@/lib/assistant/event-quick-check/resolve-deep-scan-for-quick-check';
import type { CheckionProjectDeepScanStarted } from '@/lib/integrations/checkion-project-deep-scan-client';
import {
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY,
} from '@/lib/paths/event-quick-check-page';

export type DeepScanProgress = {
  complete: number;
  total: number;
  detail: string;
};

export type EventQuickCheckDeepScanStatus = {
  deepScanStarted: boolean;
  allComplete?: boolean;
  deepScanProgress?: DeepScanProgress;
  checkionProjectId?: string;
};

/** Resolve CHECKION deep-scan progress from persisted workflow run state. */
export async function resolveEventQuickCheckDeepScanStatus(
  stored: Record<string, unknown>
): Promise<EventQuickCheckDeepScanStatus> {
  const started = stored[EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY] as
    | CheckionProjectDeepScanStarted
    | undefined;
  if (!started) {
    return { deepScanStarted: false };
  }

  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
    | EventQuickCheckResumeCheckpoint
    | undefined;
  const resolved = await resolveDeepScanForQuickCheck(started);

  return {
    deepScanStarted: true,
    allComplete: resolved?.allComplete ?? false,
    deepScanProgress: resolved?.progress,
    checkionProjectId: checkpoint?.checkionProjectId,
  };
}
