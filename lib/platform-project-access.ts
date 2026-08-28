import { canManageCompany } from '@/lib/auth-company-access';
import type { RequestUser } from '@/lib/auth-request-user';
import { isAdmin } from '@/lib/auth-request-user';
import { USER_ROLE } from '@/lib/db/schema';
import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';
import { PLATFORM_PROJECT_ASSIGNMENT_ROLE } from '@/lib/platform-provisioning';

/**
 * Access model B: creator, direct assignment, or legacy product assignment.
 * Company membership alone does not grant view. Global admins see all.
 */
export async function userCanViewPlatformProject(
  userId: string,
  userRole: string,
  platformProjectId: string
): Promise<boolean> {
  if (userRole === USER_ROLE.ADMIN) return true;
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return false;
  if (project.createdByUserId === userId) return true;
  const direct = await getUserPlatformProjectAssignment(userId, platformProjectId);
  if (direct) return true;
  const legacy = await listUserProductProjectAssignments(userId);
  for (const row of legacy) {
    const resolved = await findPlatformProjectIdByProductExternal(row.productId, row.projectId);
    if (resolved === platformProjectId) return true;
  }
  return false;
}

/**
 * Archive / restore Collection: company manager, Collection admin assignment, or creator.
 * Used by product BFFs (service + X-Plexon-User-Id) and aligns with creator-first Access Model B.
 */
export async function userCanManageCollectionLifecycle(
  user: Pick<RequestUser, 'id' | 'role'>,
  platformProjectId: string
): Promise<boolean> {
  if (isAdmin(user as RequestUser)) return true;
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return false;
  if (project.createdByUserId === user.id) return true;
  if (await canManageCompany(user as RequestUser, project.companyId)) return true;
  const assignment = await getUserPlatformProjectAssignment(user.id, platformProjectId);
  return assignment?.role === PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN;
}
