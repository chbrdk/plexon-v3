import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  cancelEventQuickCheckGeoReopen,
  reopenEventQuickCheckGeoQuestions,
} from '@/lib/assistant/event-quick-check/reopen-geo-questions';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  let body: { cancel?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    if (body.cancel) {
      const result = await cancelEventQuickCheckGeoReopen({ user, workflowRunId: runId });
      return Response.json(result);
    }
    const result = await reopenEventQuickCheckGeoQuestions({ user, workflowRunId: runId });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') return apiError('Not found', API_STATUS.NOT_FOUND);
      if (e.message === 'INVALID_RUN') return apiError('Invalid run', API_STATUS.BAD_REQUEST);
      if (e.message === 'GEO_REOPEN_UNAVAILABLE') {
        return apiError(
          'GEO-Fragen können für diesen Lauf nicht erneut bearbeitet werden (Checkpoint fehlt).',
          API_STATUS.BAD_REQUEST
        );
      }
      if (e.message === 'NO_REPORT') {
        return apiError('No report to restore', API_STATUS.BAD_REQUEST);
      }
    }
    throw e;
  }
}
