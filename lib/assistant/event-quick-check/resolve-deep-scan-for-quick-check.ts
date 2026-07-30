import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import {
  collectCompletedDeepScanPreviews,
  type CheckionProjectDeepScanStarted,
} from '@/lib/integrations/checkion-project-deep-scan-client';
import type { EventQuickCheckStepOutcome } from '@/lib/assistant/playbooks/run-event-quick-check';

export type ResolvedDeepScanForQuickCheck = {
  domainScan?: DomainScanPreview;
  competitorScans: Record<string, DomainScanPreview>;
  failed: string[];
  allComplete: boolean;
  progress: { complete: number; total: number; detail: string };
};

export async function resolveDeepScanForQuickCheck(
  started: CheckionProjectDeepScanStarted | undefined
): Promise<ResolvedDeepScanForQuickCheck | null> {
  if (!started) return null;
  const collected = await collectCompletedDeepScanPreviews(started);
  if (!collected.ok) {
    return {
      domainScan: undefined,
      competitorScans: {},
      failed: [collected.error],
      allComplete: false,
      progress: { complete: 0, total: 0, detail: collected.error },
    };
  }
  return {
    domainScan: collected.ownScan,
    competitorScans: collected.competitorScans,
    failed: collected.failed,
    allComplete: collected.allComplete,
    progress: collected.progress,
  };
}

export function mergeDeepScanIntoOutcomes(
  outcomes: EventQuickCheckStepOutcome[],
  resolved: ResolvedDeepScanForQuickCheck
): EventQuickCheckStepOutcome[] {
  const idx = outcomes.findIndex((o) => o.stepId === 'domain_scan');
  const patch: EventQuickCheckStepOutcome = {
    stepId: 'domain_scan',
    label: 'Domain-Scan',
    status: resolved.domainScan ? 'done' : 'error',
    ...(resolved.domainScan
      ? {
          data: {
            ownScanId: resolved.domainScan.id,
            competitorScans: resolved.competitorScans,
            failed: resolved.failed,
          },
        }
      : { error: resolved.failed.join('; ') || 'Deep Scan unvollständig' }),
  };
  if (idx >= 0) {
    const next = [...outcomes];
    next[idx] = { ...next[idx], ...patch };
    return next;
  }
  return [...outcomes, patch];
}
