import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { reportFromWorkflowRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import { materializeEqcPitchSlides } from '@/lib/assistant/reports/eqc-pitch-slides/materialize-eqc-pitch-slides';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';

export const dynamic = 'force-dynamic';

/** Materialize EQC report → CREATION 16:9 pitch slides — specs/domain/eqc-pitch-slides.md */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const { runId } = await ctx.params;
  const run = await getAssistantWorkflowRunById(runId);
  if (!run || !(await userCanAccessEventQuickCheckRun(user, run))) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const report = reportFromWorkflowRun(run);
  if (!report) return apiError('Report not ready', API_STATUS.NOT_FOUND);

  const result = await materializeEqcPitchSlides({
    report,
    actorUserId: user.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result, { status: 201 });
}
