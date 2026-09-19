import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { exportClientShareEventsCsv } from '@/lib/creation-client-share';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * GET CSV audit export for Collection client shares (P5).
 * Spec: specs/domain/creation-client-share.md
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const actor = await resolveInviteActor(request);
  if (!actor) return inviteActorUnauthorized(request);

  const { platformProjectId: rawId } = await ctx.params;
  const platformProjectId = rawId?.trim();
  if (!platformProjectId) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

  const result = await exportClientShareEventsCsv(platformProjectId, actor);
  if (!result.ok) {
    return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status);
  }

  return new Response(result.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
