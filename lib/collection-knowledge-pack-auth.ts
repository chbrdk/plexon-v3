import {
  getRequestUser,
  isAdmin,
  type RequestUser,
} from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { PLATFORM_PROJECT_ASSIGNMENT_ROLE } from '@/lib/platform-provisioning';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  readServiceSecret,
} from '@/lib/platform-contract';

export function isServiceSecretAuthorized(request: Request): boolean {
  const serviceSecret = process.env.PLEXON_SERVICE_SECRET ?? '';
  const secret = readServiceSecret(request);
  return Boolean(serviceSecret && secret === serviceSecret);
}

export function hasValidContractHeader(request: Request): boolean {
  const contract = request.headers.get(PLEXON_CONTRACT_VERSION_HEADER)?.trim();
  return contract === PLEXON_FEDERATION_CONTRACT_VERSION;
}

export type KnowledgeAuth =
  | { kind: 'service' }
  | { kind: 'session'; user: RequestUser };

/** Session viewer OR valid service secret (+ contract for service). */
export async function authorizeKnowledgeRead(
  request: Request,
  platformProjectId: string
): Promise<KnowledgeAuth | { error: 'unauthorized' | 'forbidden' | 'contract' }> {
  if (isServiceSecretAuthorized(request)) {
    if (!hasValidContractHeader(request)) return { error: 'contract' };
    return { kind: 'service' };
  }
  const user = await getRequestUser(request);
  if (!user) return { error: 'unauthorized' };
  const allowed = await userCanViewPlatformProject(user.id, user.role, platformProjectId);
  if (!allowed) return { error: 'forbidden' };
  return { kind: 'session', user };
}

/**
 * Admin session may replace/edit pack facets.
 * Service callers use publish/PATCH with facet ownership (checked separately).
 */
export async function userCanEditKnowledgePack(
  user: RequestUser,
  platformProjectId: string
): Promise<boolean> {
  if (isAdmin(user)) return true;
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return false;
  if (await canManageCompany(user, project.companyId)) return true;
  const assignment = await getUserPlatformProjectAssignment(user.id, platformProjectId);
  return assignment?.role === PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN;
}
