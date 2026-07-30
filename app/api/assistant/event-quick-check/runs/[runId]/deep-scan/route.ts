import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { continueEventQuickCheckAfterDeepScan } from '@/lib/assistant/event-quick-check/continue-after-deep-scan';
import type { CheckionProjectDeepScanStarted } from '@/lib/integrations/checkion-project-deep-scan-client';
import { resolveDeepScanForQuickCheck } from '@/lib/assistant/event-quick-check/resolve-deep-scan-for-quick-check';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';
import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import {
  EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY,
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY,
} from '@/lib/paths/event-quick-check-page';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  const run = await getAssistantWorkflowRunById(runId);
  if (!run || run.userId !== user.id) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const stored = run.result ?? {};
  const started = stored[EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY] as
    | CheckionProjectDeepScanStarted
    | undefined;
  if (!started) {
    return Response.json({ ok: false, error: 'NO_DEEP_SCAN' });
  }

  const resolved = await resolveDeepScanForQuickCheck(started);
  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
    | EventQuickCheckResumeCheckpoint
    | undefined;

  return Response.json({
    ok: true,
    awaitingDeepScan: Boolean(stored[EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY]),
    allComplete: resolved?.allComplete ?? false,
    progress: resolved?.progress ?? { complete: 0, total: 0, detail: 'Unbekannt' },
    checkionProjectId: checkpoint?.checkionProjectId,
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;

  try {
    const result = await continueEventQuickCheckAfterDeepScan({
      user,
      workflowRunId: runId,
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') return apiError('Not found', API_STATUS.NOT_FOUND);
      if (e.message === 'DEEP_SCAN_NOT_AWAITING') {
        return apiError('Deep scan not awaiting', API_STATUS.BAD_REQUEST);
      }
      if (e.message === 'GEO_NOT_CONFIRMED') {
        return apiError('GEO questions not confirmed', API_STATUS.BAD_REQUEST);
      }
    }
    throw e;
  }
}
