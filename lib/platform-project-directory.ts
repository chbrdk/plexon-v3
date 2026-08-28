import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import {
  getPlatformProjectById,
  listPlatformProjectsCreatedByUser,
  type ListPlatformProjectsOptions,
} from '@/lib/db/platform-projects';
import { listUserPlatformProjectAssignments } from '@/lib/db/user-platform-project-assignments';
import { PLATFORM_PROJECT_STATUS } from '@/lib/platform-companies';

type PlatformProjectRow = NonNullable<Awaited<ReturnType<typeof getPlatformProjectById>>>;

/**
 * Platform projects the user may open (access model B):
 * - Collections they **created** (`created_by_user_id`),
 * - explicit `user_platform_project_assignments`,
 * - platform projects linked via entitlements **product** project assignments
 *   (`user_product_project_assignments` → bindings).
 *
 * Company membership alone does **not** grant visibility.
 * Default excludes archived Collections (`includeArchived: true` for hub archive section).
 */
export async function listAccessiblePlatformProjectsForUser(
  userId: string,
  options: ListPlatformProjectsOptions = {}
): Promise<PlatformProjectRow[]> {
  const includeArchived = options.includeArchived === true;
  const fromCreator = await listPlatformProjectsCreatedByUser(userId, { includeArchived });
  const assignments = await listUserPlatformProjectAssignments(userId);
  const legacyProductAssignments = await listUserProductProjectAssignments(userId);
  const byId = new Map<string, PlatformProjectRow>();
  for (const row of fromCreator) {
    byId.set(row.id, row);
  }
  for (const a of assignments) {
    if (byId.has(a.platformProjectId)) continue;
    const p = await getPlatformProjectById(a.platformProjectId);
    if (!p) continue;
    if (!includeArchived && p.status === PLATFORM_PROJECT_STATUS.ARCHIVED) continue;
    byId.set(p.id, p);
  }
  for (const legacy of legacyProductAssignments) {
    const platformId = await findPlatformProjectIdByProductExternal(legacy.productId, legacy.projectId);
    if (!platformId || byId.has(platformId)) continue;
    const p = await getPlatformProjectById(platformId);
    if (!p) continue;
    if (!includeArchived && p.status === PLATFORM_PROJECT_STATUS.ARCHIVED) continue;
    byId.set(p.id, p);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}
