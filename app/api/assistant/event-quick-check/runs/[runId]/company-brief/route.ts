import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { persistCompanyBriefConfirmation } from '@/lib/assistant/event-quick-check/confirm-company-brief';
import { executeEventQuickCheckRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';

export const runtime = 'nodejs';
/**
 * Next segment config literal only (short persist + kickoff after 202).
 * Domain-scan poll budget is independent — see `domainScanPollMaxMs`.
 */
export const maxDuration = 900;

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
    const prep = await persistCompanyBriefConfirmation({
      user,
      workflowRunId: runId,
      displayName: body.displayName,
      industry: body.industry,
      summary: body.summary,
      targetAudienceHint: body.targetAudienceHint,
      disambiguationNote: body.disambiguationNote,
    });

    // Domain scan can exceed proxy timeouts — finish in background; client polls GET run.
    void executeEventQuickCheckRun({
      user,
      workflowRunId: prep.workflowRunId,
      companyBriefConfirmed: prep.companyBriefConfirmed,
    }).catch((error) => {
      console.error('[event-quick-check company-brief]', error);
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
      if (e.message === 'BRIEF_NOT_AWAITING') {
        return apiError('Company brief not awaiting confirmation', API_STATUS.BAD_REQUEST);
      }
    }
    throw e;
  }
}
