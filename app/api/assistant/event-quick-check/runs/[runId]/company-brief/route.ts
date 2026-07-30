import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { confirmEventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/confirm-company-brief';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  let body: {
    displayName?: string;
    industry?: string;
    summary?: string;
    targetAudienceHint?: string;
    disambiguationNote?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await confirmEventQuickCheckCompanyBrief({
      user,
      workflowRunId: runId,
      displayName: body.displayName,
      industry: body.industry,
      summary: body.summary,
      targetAudienceHint: body.targetAudienceHint,
      disambiguationNote: body.disambiguationNote,
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') return apiError('Not found', API_STATUS.NOT_FOUND);
      if (e.message === 'BRIEF_NOT_AWAITING') {
        return apiError('Company brief not awaiting confirmation', API_STATUS.BAD_REQUEST);
      }
    }
    throw e;
  }
}
