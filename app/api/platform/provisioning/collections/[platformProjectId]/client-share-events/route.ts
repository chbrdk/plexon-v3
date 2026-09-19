import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { appendClientShareEvent } from '@/lib/creation-client-share';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * POST Creation client-share audit event ingest (P5).
 * Spec: specs/domain/creation-client-share.md
 */
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

  const result = await appendClientShareEvent({
    platformProjectId,
    shareId: typeof body.shareId === 'string' ? body.shareId : '',
    eventType: typeof body.eventType === 'string' ? body.eventType : '',
    actorUserId:
      typeof body.actorUserId === 'string'
        ? body.actorUserId
        : actor.id,
    meta:
      body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
        ? (body.meta as Record<string, unknown>)
        : {},
    createdAt: typeof body.createdAt === 'string' ? body.createdAt : null,
    id: typeof body.id === 'string' ? body.id : null,
  });

  if (!result.ok) {
    return apiError(
      result.status === 404 ? 'Not found' : 'Invalid event',
      result.status === 404 ? 404 : API_STATUS.BAD_REQUEST
    );
  }
  return platformJson({ ok: true, id: result.id });
}
