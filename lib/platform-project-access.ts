import { USER_ROLE } from '@/lib/db/schema';
import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';

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
