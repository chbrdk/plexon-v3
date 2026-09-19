import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  getClientSharePolicy,
  patchClientSharePolicy,
} from '@/lib/creation-client-share';
import { platformJson } from '@/lib/platform-contract';
import { inviteActorUnauthorized, resolveInviteActor } from '@/lib/resolve-invite-actor';

/**
 * GET/PATCH Collection Client Page Share policy.
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

  const result = await getClientSharePolicy(platformProjectId, actor);
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status);
  return platformJson(result.policy);
}

export async function PATCH(
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

  const result = await patchClientSharePolicy(platformProjectId, actor, {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    allowPublicLink: typeof body.allowPublicLink === 'boolean' ? body.allowPublicLink : undefined,
    requirePassword: typeof body.requirePassword === 'boolean' ? body.requirePassword : undefined,
    maxTtlDays:
      body.maxTtlDays === null
        ? null
        : typeof body.maxTtlDays === 'number'
          ? body.maxTtlDays
          : undefined,
    allowLiveHead: typeof body.allowLiveHead === 'boolean' ? body.allowLiveHead : undefined,
    allowEmailAllowlist:
      typeof body.allowEmailAllowlist === 'boolean' ? body.allowEmailAllowlist : undefined,
  });

  if (!result.ok) {
    return apiError(result.error || (result.status === 404 ? 'Not found' : 'Forbidden'), result.status);
  }
  return platformJson(result.policy);
}
