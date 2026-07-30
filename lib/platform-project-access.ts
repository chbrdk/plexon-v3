import { USER_ROLE } from '@/lib/db/schema';
import { getCompanyIdsForUser } from '@/lib/db/companies';
import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';

export async function userCanViewPlatformProject(
  userId: string,
  userRole: string,
  platformProjectId: string
): Promise<boolean> {
  if (userRole === USER_ROLE.ADMIN) return true;
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return false;
  const direct = await getUserPlatformProjectAssignment(userId, platformProjectId);
  if (direct) return true;
  const companyIds = await getCompanyIdsForUser(userId);
  if (companyIds.includes(project.companyId)) return true;
  const legacy = await listUserProductProjectAssignments(userId);
  for (const row of legacy) {
    const resolved = await findPlatformProjectIdByProductExternal(row.productId, row.projectId);
    if (resolved === platformProjectId) return true;
  }
  return false;
}
