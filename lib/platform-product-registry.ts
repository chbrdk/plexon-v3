import type { RequestUser } from '@/lib/auth-request-user';
import { getUserProductEntitlementsMap } from '@/lib/db/product-entitlements';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import {
  expandAssignmentsForProvisioning,
  listUserPlatformProjectAssignments,
} from '@/lib/db/user-platform-project-assignments';
import { getUserProductProvisioningMap } from '@/lib/db/product-provisioning';
import { getPlatformProductDefinitions, getPlatformProductSummaries } from '@/lib/platform-products';

export async function getPlatformProductSummariesForUser(user: RequestUser) {
  const entitlements = process.env.DATABASE_URL ? await getUserProductEntitlementsMap(user.id) : {};
  return getPlatformProductSummaries({
    viewerRole: user.role,
    entitlements,
  });
}

export async function getManagedPlatformProductsForUser(userId: string, viewerRole?: string | null) {
  const entitlements = process.env.DATABASE_URL ? await getUserProductEntitlementsMap(userId) : {};
  const legacyAssignments = process.env.DATABASE_URL
    ? await listUserProductProjectAssignments(userId)
    : [];
  const expandedAssignments = process.env.DATABASE_URL
    ? await expandAssignmentsForProvisioning(userId, legacyAssignments)
    : [];
  const platformProjectAssignments = process.env.DATABASE_URL
    ? await listUserPlatformProjectAssignments(userId)
    : [];
  const provisioning = process.env.DATABASE_URL ? await getUserProductProvisioningMap(userId) : {};
  const definitions = getPlatformProductDefinitions();

  return definitions.map((product) => ({
    productId: product.id,
    name: product.name,
    lifecycle: product.lifecycle,
    surface: product.surface,
    entryPoints: product.entryPoints,
    defaultAccess: product.defaultAccess,
    entitlement: entitlements[product.id]
      ? {
          status: entitlements[product.id]?.status,
          platformRole: entitlements[product.id]?.platformRole,
          defaultContext: entitlements[product.id]?.defaultContext ?? null,
        }
      : null,
    projectAssignments: expandedAssignments
      .filter((assignment) => assignment.productId === product.id)
      .map((assignment) => ({
        projectId: assignment.projectId,
        role: assignment.role,
      })),
    platformProjectAssignments: platformProjectAssignments.map((a) => ({
      platformProjectId: a.platformProjectId,
      role: a.role,
    })),
    provisioning: provisioning[product.id]
      ? {
          desiredState: provisioning[product.id]?.desiredState,
          syncStatus: provisioning[product.id]?.syncStatus,
          syncMessage: provisioning[product.id]?.syncMessage ?? null,
          lastAttemptAt: provisioning[product.id]?.lastAttemptAt ?? null,
          lastSucceededAt: provisioning[product.id]?.lastSucceededAt ?? null,
          externalUserRef: provisioning[product.id]?.externalUserRef ?? null,
        }
      : null,
    viewerRole: viewerRole ?? null,
  }));
}
