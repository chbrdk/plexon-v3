/**
 * When the 202 background poller dies after CHECKION finishes the domain crawl,
 * GET …/runs/:id must resume domain → persona → GEO confirm without a new crawl.
 */

import type { RequestUser } from '@/lib/auth-request-user';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { executeEventQuickCheckRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { hasEqcExecuteLock } from '@/lib/assistant/event-quick-check/eqc-execute-lock';
import { markEventQuickCheckBackgroundFailure } from '@/lib/assistant/event-quick-check/mark-eqc-background-failure';
import { resolveEqcDomainScanIdFromStored } from '@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count';
import {
  getAssistantWorkflowRunById,
  updateAssistantWorkflowRun,
  type StoredAssistantWorkflowRun,
} from '@/lib/db/assistant-workflow-runs';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import {
  fetchCheckionDomainScanV3Detail,
  findCheckionDomainScanIdByUrl,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import {
  EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY,
  EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY,
  EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY,
  EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_DOMAIN_RECONCILE_KICKED_AT_KEY,
  EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY,
} from '@/lib/paths/event-quick-check-page';

const RECONCILE_COOLDOWN_MS = 90_000;

function isCompletedStatus(status: string): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'completed' || s === 'complete';
}

function isFailedStatus(status: string): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'failed' || s === 'error' || s === 'cancelled';
}

export type EqcDomainReconcileResult = 'skipped' | 'kicked' | 'failed_marked';

/**
 * Fire-and-forget from GET poll: if Domain is stuck but CHECKION already completed,
 * kick continue_after_* with preferDomainScanId so persona + GEO gate can run.
 */
export async function maybeReconcileEqcDomainScan(input: {
  user: RequestUser;
  run: StoredAssistantWorkflowRun;
}): Promise<EqcDomainReconcileResult> {
  const { run, user } = input;
  if (run.status !== 'running') return 'skipped';
  if (hasEqcExecuteLock(run.id)) return 'skipped';

  const stored = (run.result ?? {}) as Record<string, unknown>;
  if (
    stored[EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY] ||
    stored[EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY] ||
    stored[EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY] ||
    stored[EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY]
  ) {
    return 'skipped';
  }

  const competitorsConfirmed = stored[EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY] as
    | string[]
    | undefined;
  const competitorsCheckpoint = stored[EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY];
  const companyBriefConfirmed = stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY] as
    | EventQuickCheckCompanyBrief
    | undefined;

  const pastCompetitors =
    Array.isArray(competitorsConfirmed) && competitorsConfirmed.length > 0;
  // Complete-depth runs keep competitorsCheckpoint even before confirm; prefer confirmed list.
  const pastBriefOnly =
    Boolean(companyBriefConfirmed) &&
    !(Array.isArray(competitorsConfirmed) && competitorsConfirmed.length > 0);

  if (!pastCompetitors && !pastBriefOnly) {
    console.info('[eqc domain-reconcile] skipped: not past brief/competitors', {
      runId: run.id,
    });
    return 'skipped';
  }

  const kickedAtRaw = stored[EVENT_QUICK_CHECK_DOMAIN_RECONCILE_KICKED_AT_KEY];
  if (typeof kickedAtRaw === 'string') {
    const t = Date.parse(kickedAtRaw);
    if (Number.isFinite(t) && Date.now() - t < RECONCILE_COOLDOWN_MS) {
      return 'skipped';
    }
  }

  const url = typeof stored.url === 'string' ? stored.url : '';
  const platformProjectId =
    typeof stored.platformProjectId === 'string' ? stored.platformProjectId : null;

  let scanId =
    (typeof stored[EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY] === 'string'
      ? String(stored[EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY]).trim()
      : '') ||
    resolveEqcDomainScanIdFromStored(stored) ||
    '';

  let checkionProjectId: string | null = null;
  if (platformProjectId) {
    try {
      checkionProjectId = await getExternalProjectId(platformProjectId, 'checkion');
    } catch {
      checkionProjectId = null;
    }
  }

  if (!scanId && url) {
    scanId =
      (await findCheckionDomainScanIdByUrl({
        url,
        projectId: checkionProjectId,
        preferCompleted: true,
      })) ?? '';
  }

  if (!scanId) {
    console.info('[eqc domain-reconcile] skipped: no scan id', { runId: run.id, url });
    return 'skipped';
  }

  const detail = await fetchCheckionDomainScanV3Detail(scanId);
  if (!detail.ok) {
    console.info('[eqc domain-reconcile] skipped: detail fetch failed', {
      runId: run.id,
      scanId,
      error: detail.error,
    });
    return 'skipped';
  }

  const status = String(detail.scan.status ?? '').toLowerCase();

  if (isFailedStatus(status)) {
    await updateAssistantWorkflowRun(run.id, {
      status: 'failed',
      result: {
        ...stored,
        [EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY]: scanId,
        error: detail.scan.error ?? `Domain-Scan ${status}`,
      },
    });
    return 'failed_marked';
  }

  if (!isCompletedStatus(status)) {
    if (!stored[EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY]) {
      await updateAssistantWorkflowRun(run.id, {
        result: {
          ...stored,
          [EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY]: scanId,
        },
      });
    }
    return 'skipped';
  }

  const latest = await getAssistantWorkflowRunById(run.id);
  const prior = (latest?.result ?? stored) as Record<string, unknown>;
  if (
    prior[EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY] ||
    prior[EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY] ||
    prior[EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]
  ) {
    return 'skipped';
  }
  if (hasEqcExecuteLock(run.id)) return 'skipped';

  await updateAssistantWorkflowRun(run.id, {
    result: {
      ...prior,
      [EVENT_QUICK_CHECK_DOMAIN_SCAN_ID_KEY]: scanId,
      [EVENT_QUICK_CHECK_DOMAIN_RECONCILE_KICKED_AT_KEY]: new Date().toISOString(),
    },
  });

  console.info('[eqc domain-reconcile] kicking resume', {
    runId: run.id,
    scanId,
    via: pastCompetitors ? 'competitors' : 'brief',
  });

  void executeEventQuickCheckRun({
    user,
    workflowRunId: run.id,
    preferDomainScanId: scanId,
    ...(pastCompetitors
      ? { competitorsConfirmed: competitorsConfirmed! }
      : { companyBriefConfirmed: companyBriefConfirmed! }),
  }).catch((error) => {
    void markEventQuickCheckBackgroundFailure(run.id, error, 'domain-reconcile');
  });

  return 'kicked';
}
