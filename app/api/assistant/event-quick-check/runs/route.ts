import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { createEventQuickCheckRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import type { EventQuickCheckDepth } from '@/lib/paths/assistant-workflows';
import { mapEventQuickCheckRunToHistoryItem } from '@/lib/assistant/event-quick-check/event-quick-check-history';
import { listEventQuickCheckRunsForViewer } from '@/lib/assistant/event-quick-check/list-event-quick-check-runs-for-viewer';

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

  const runs = await listEventQuickCheckRunsForViewer({
    userId: user.id,
    userRole: user.role,
    limit: Number.isFinite(limit) ? limit : 50,
  });

  const items = runs
    .map((run) =>
      mapEventQuickCheckRunToHistoryItem(run, {
        viewerUserId: user.id,
        ownerName: run.ownerName,
        ownerEmail: run.ownerEmail,
      })
    )
    .filter((item): item is NonNullable<typeof item> => item != null);

  return Response.json({ items });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: {
    url?: string;
    projectName?: string;
    platformProjectId?: string;
    depth?: EventQuickCheckDepth;
    scanMaxPages?: number;
    targetGroupCount?: number;
    personaCount?: number;
    maxCompetitors?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('Invalid JSON body', API_STATUS.BAD_REQUEST);
  }

  const url = body.url?.trim();
  if (!url) return apiError('url is required', API_STATUS.BAD_REQUEST);

  try {
    const run = await createEventQuickCheckRun({
      user,
      url,
      projectName: body.projectName,
      platformProjectId: body.platformProjectId,
      depth: body.depth === 'complete' ? 'complete' : 'quick',
      scanMaxPages: body.scanMaxPages,
      targetGroupCount: body.targetGroupCount,
      personaCount: body.personaCount,
      maxCompetitors: body.maxCompetitors,
    });
    return Response.json(run);
  } catch (e) {
    if (e instanceof Error && e.message === 'INVALID_URL') {
      return apiError('Invalid URL', API_STATUS.BAD_REQUEST);
    }
    throw e;
  }
}
