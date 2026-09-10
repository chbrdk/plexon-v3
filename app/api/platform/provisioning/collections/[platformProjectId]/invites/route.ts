import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  createCollectionInvite,
  listCollectionInvites,
  revokeCollectionInvite,
} from '@/lib/collection-invites';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * Service/session: create or list Collection invites.
 * Spec: specs/api/collection-invites.md
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

  const result = await listCollectionInvites(platformProjectId, actor);
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status);

  return platformJson({
    items: result.items.map((item) => ({
      inviteId: item.id,
      role: item.role,
      sceneId: item.sceneId,
      expiresAt: item.expiresAt.toISOString(),
      maxUses: item.maxUses,
      useCount: item.useCount,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const actor = await resolveInviteActor(request);
  if (!actor) return inviteActorUnauthorized(request);

  const { platformProjectId: rawId } = await ctx.params;
  const platformProjectId = rawId?.trim();
  if (!platformProjectId) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await createCollectionInvite({
    platformProjectId,
    createdBy: actor,
    role: body.role,
    sceneId: body.sceneId,
    expiresInDays: body.expiresInDays,
    maxUses: body.maxUses,
  });

  if (!result.ok) return apiError(result.error, result.status);
  const { ok: _ok, ...payload } = result;
  return platformJson(payload);
}
