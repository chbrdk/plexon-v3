import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const { platformProjectId } = await ctx.params;
  if (!platformProjectId?.trim()) {
    return apiError('Invalid project id', API_STATUS.BAD_REQUEST);
  }
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const project = await getPlatformProjectById(platformProjectId.trim());
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

  const allowed = await userCanViewPlatformProject(user.id, user.role, platformProjectId.trim());
  if (!allowed) return apiError('Forbidden', API_STATUS.FORBIDDEN);

  try {
    const results = await syncPlatformProjectToProducts(platformProjectId.trim(), {
      source: 'plexon-assistant-sync',
    });
    return Response.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
