import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  persistGeoQuestionsConfirmation,
} from '@/lib/assistant/event-quick-check/confirm-geo-questions';
import { executeEventQuickCheckRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { GeoMeasurement } from '@/lib/geo/measurement';

export const runtime = 'nodejs';
/** Dual-layer GEO — keep in sync with `EQC_LONG_RUNNING_MAX_DURATION_SEC`. */
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
    questions?: string[];
    groups?: PersonaGeoQuestionGroup[];
    measurements?: GeoMeasurement[];
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const prep = await persistGeoQuestionsConfirmation({
      user,
      workflowRunId: runId,
      questions: body.questions,
      groups: body.groups,
      measurements: body.measurements,
    });

    // Dual GEO layers can exceed proxy timeouts — finish in background; client polls GET run.
    void executeEventQuickCheckRun({
      user,
      workflowRunId: prep.workflowRunId,
      geoQuestionsConfirmed: prep.geoQuestionsConfirmed,
      geoCompetitorsConfirmed: prep.geoCompetitorsConfirmed,
      geoMeasurementsConfirmed: prep.geoMeasurementsConfirmed,
    }).catch((error) => {
      console.error('[event-quick-check geo-questions]', error);
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
