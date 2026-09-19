import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { revokeCollectionMember } from '@/lib/collection-members';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * Service/session: revoke a Collection assignment (never the creator).
 * Spec: specs/api/collection-members.md
 */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; userId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const actor = await resolveInviteActor(request);
  if (!actor) return inviteActorUnauthorized(request);

  const { platformProjectId: rawId, userId: rawUserId } = await ctx.params;
  const platformProjectId = rawId?.trim();
  const userId = rawUserId?.trim();
  if (!platformProjectId || !userId) {
    return apiError('Invalid id', API_STATUS.BAD_REQUEST);
  }

  const result = await revokeCollectionMember({
    platformProjectId,
    userId,
    actor,
  });
  if (!result.ok) return apiError(result.error, result.status);
  return platformJson({ ok: true });
}
