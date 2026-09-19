import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { revokeClientShareProjection } from '@/lib/creation-client-share';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * DELETE Creation client share projection (revoke).
 */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; shareId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const actor = await resolveInviteActor(request);
  if (!actor) return inviteActorUnauthorized(request);

  const { platformProjectId: rawId, shareId: rawShare } = await ctx.params;
  const platformProjectId = rawId?.trim();
  const shareId = rawShare?.trim();
  if (!platformProjectId || !shareId) {
    return apiError('Invalid id', API_STATUS.BAD_REQUEST);
  }

  const result = await revokeClientShareProjection(platformProjectId, shareId, actor);
  if (!result.ok) {
    if (result.status === 404) return apiError('Not found', 404);
    if (result.status === 403) return apiError('Forbidden', 403);
    return apiError(result.error || 'Creation revoke failed', result.status);
  }
  return platformJson({ ok: true });
}
