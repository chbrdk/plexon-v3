import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { persistCompetitorsConfirmation } from '@/lib/assistant/event-quick-check/confirm-competitors';
import { executeEventQuickCheckRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';

export const runtime = 'nodejs';
/** Must be a numeric literal (Next segment config). Same as `EQC_LONG_RUNNING_MAX_DURATION_SEC`. */
export const maxDuration = 900;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  let body: { competitors?: string[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const prep = await persistCompetitorsConfirmation({
      user,
      workflowRunId: runId,
      competitors: body.competitors,
    });

    // Domain scan can exceed proxy timeouts — finish in background; client polls GET run.
    void executeEventQuickCheckRun({
      user,
      workflowRunId: prep.workflowRunId,
      competitorsConfirmed: prep.competitorsConfirmed,
    }).catch((error) => {
      console.error('[event-quick-check competitors]', error);
    });

    return Response.json(
      {
        ok: true,
        accepted: true,
        workflowRunId: prep.workflowRunId,
        status: 'running',
      },
      { status: 202 }
    );
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') return apiError('Not found', API_STATUS.NOT_FOUND);
      if (e.message === 'COMPETITORS_NOT_AWAITING') {
        return apiError('Competitors not awaiting confirmation', API_STATUS.BAD_REQUEST);
      }
      if (e.message === 'COMPETITORS_EMPTY') {
        return apiError('At least one competitor domain is required', API_STATUS.BAD_REQUEST);
      }
      return apiError(e.message, API_STATUS.BAD_REQUEST);
    }
    throw e;
  }
}
