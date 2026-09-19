import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  listClientShareProjections,
  upsertClientShareProjection,
} from '@/lib/creation-client-share';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * GET/POST Creation client share inventory projection.
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

  const result = await listClientShareProjections(platformProjectId, actor);
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status);
  return platformJson({ items: result.items });
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

  const result = await upsertClientShareProjection(platformProjectId, actor, {
    shareId: typeof body.shareId === 'string' ? body.shareId : '',
    sceneId: typeof body.sceneId === 'string' ? body.sceneId : '',
    pageIds: Array.isArray(body.pageIds)
      ? body.pageIds.filter((p): p is string => typeof p === 'string')
      : [],
    accessMode: typeof body.accessMode === 'string' ? body.accessMode : 'password',
    contentMode: typeof body.contentMode === 'string' ? body.contentMode : 'pinned_revision',
    label: typeof body.label === 'string' ? body.label : null,
    expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
    revokedAt: typeof body.revokedAt === 'string' ? body.revokedAt : null,
    createdAt: typeof body.createdAt === 'string' ? body.createdAt : null,
  });

  if (!result.ok) {
    return apiError(result.error || (result.status === 404 ? 'Not found' : 'Forbidden'), result.status);
  }
  return platformJson({ ok: true });
}
