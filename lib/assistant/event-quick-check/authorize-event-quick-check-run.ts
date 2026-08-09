import type { RequestUser } from '@/lib/auth-request-user';
import type { StoredAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';
import { getAssistantConversationById } from '@/lib/db/assistant-conversations';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';

/** Resolve Collection id from run result / report / conversation. */
export async function resolveEqcPlatformProjectId(
  run: StoredAssistantWorkflowRun
): Promise<string | undefined> {
  const stored = run.result ?? {};
  if (typeof stored.platformProjectId === 'string' && stored.platformProjectId.trim()) {
    return stored.platformProjectId.trim();
  }
  const report = stored[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY] as
    | { meta?: { platformProjectId?: string } }
    | undefined;
  if (typeof report?.meta?.platformProjectId === 'string' && report.meta.platformProjectId.trim()) {
    return report.meta.platformProjectId.trim();
  }
  const conversation = await getAssistantConversationById(run.conversationId);
  if (conversation?.platformProjectId?.trim()) {
    return conversation.platformProjectId.trim();
  }
  return undefined;
}

/**
 * Owner always; otherwise Collection viewers via userCanViewPlatformProject.
 * Runs without a platform project stay owner-only.
 */
export async function userCanAccessEventQuickCheckRun(
  user: RequestUser,
  run: StoredAssistantWorkflowRun
): Promise<boolean> {
  if (run.type !== EVENT_QUICK_CHECK_PLAYBOOK_ID && run.type !== 'event_quick_check') {
    return false;
  }
  if (run.userId === user.id) return true;
  const platformProjectId = await resolveEqcPlatformProjectId(run);
  if (!platformProjectId) return false;
  return userCanViewPlatformProject(user.id, user.role, platformProjectId);
}

/** Load run and enforce access; throws NOT_FOUND when missing or denied. */
export async function requireEventQuickCheckRunAccess(
  user: RequestUser,
  runId: string
): Promise<StoredAssistantWorkflowRun> {
  const run = await getAssistantWorkflowRunById(runId);
  if (!run || run.type !== 'event_quick_check') {
    throw new Error('NOT_FOUND');
  }
  const ok = await userCanAccessEventQuickCheckRun(user, run);
  if (!ok) throw new Error('NOT_FOUND');
  return run;
}
