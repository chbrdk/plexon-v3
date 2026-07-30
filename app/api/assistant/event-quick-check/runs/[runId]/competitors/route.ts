import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { confirmEventQuickCheckCompetitors } from '@/lib/assistant/event-quick-check/confirm-competitors';

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
    const result = await confirmEventQuickCheckCompetitors({
      user,
      workflowRunId: runId,
      competitors: body.competitors,
    });
    return Response.json(result);
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
