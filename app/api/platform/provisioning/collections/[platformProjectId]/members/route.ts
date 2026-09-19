import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  addCollectionMemberByEmail,
  listCollectionMembers,
} from '@/lib/collection-members';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * Service/session: list or add Collection members (Access Model B).
 * Spec: specs/api/collection-members.md
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

  const result = await listCollectionMembers(platformProjectId, actor);
  if (!result.ok) {
    return apiError(result.error === 'Not found' ? 'Not found' : 'Forbidden', result.status);
  }
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

  const result = await addCollectionMemberByEmail({
    platformProjectId,
    actor,
    email: body.email,
    role: body.role,
  });

  if (!result.ok) return apiError(result.error, result.status);
  return platformJson({
    status: result.status,
    userId: result.userId,
    email: result.email,
    role: result.role,
  });
}
