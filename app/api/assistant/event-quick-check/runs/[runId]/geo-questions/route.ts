import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { confirmEventQuickCheckGeoQuestions } from '@/lib/assistant/event-quick-check/confirm-geo-questions';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  let body: { questions?: string[]; groups?: PersonaGeoQuestionGroup[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await confirmEventQuickCheckGeoQuestions({
      user,
      workflowRunId: runId,
      questions: body.questions,
      groups: body.groups,
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') return apiError('Not found', API_STATUS.NOT_FOUND);
      if (e.message === 'GEO_NOT_AWAITING') {
        return apiError('GEO questions not awaiting confirmation', API_STATUS.BAD_REQUEST);
      }
      if (e.message === 'GEO_QUESTIONS_EMPTY') {
        return apiError('At least one GEO question is required', API_STATUS.BAD_REQUEST);
      }
    }
    throw e;
  }
}
