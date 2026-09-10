import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { revokeCollectionInvite } from '@/lib/collection-invites';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * Service/session: revoke a Collection invite.
 * Spec: specs/api/collection-invites.md
 */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; inviteId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const actor = await resolveInviteActor(request);
  if (!actor) return inviteActorUnauthorized(request);

  const { platformProjectId: rawProject, inviteId: rawInvite } = await ctx.params;
  const platformProjectId = rawProject?.trim();
  const inviteId = rawInvite?.trim();
  if (!platformProjectId || !inviteId) {
    return apiError('Invalid id', API_STATUS.BAD_REQUEST);
  }

  const result = await revokeCollectionInvite(platformProjectId, inviteId, actor);
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status);
  return platformJson({ ok: true });
}
