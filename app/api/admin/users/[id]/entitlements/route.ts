import { eq } from 'drizzle-orm';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { replaceUserProductEntitlements } from '@/lib/db/product-entitlements';
import { replaceUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import {
  listUserPlatformProjectAssignments,
  replaceUserPlatformProjectAssignments,
} from '@/lib/db/user-platform-project-assignments';
import { users } from '@/lib/db/schema';
import {
  isPlatformEntitlementStatus,
  isPlatformProductId,
  isPlatformRole,
  normalizePlatformLaunchContext,
  PLATFORM_ENTITLEMENT_STATUS,
  PLATFORM_ROLE,
  type ManagedPlatformEntitlementInput,
} from '@/lib/platform-entitlements';
import {
  getProvisioningDesiredState,
  isPlatformProjectAssignmentRole,
  PLATFORM_PROVISIONING_SYNC_STATUS,
  type ManagedPlatformProjectAssignmentInput,
} from '@/lib/platform-provisioning';
import { getPlatformProductDefinitions } from '@/lib/platform-products';
import { getManagedPlatformProductsForUser } from '@/lib/platform-product-registry';
import { syncUserProductProvisioning } from '@/lib/platform-provisioning-service';

function getManageableProductDefinitions() {
  return getPlatformProductDefinitions().filter((product) => product.id !== 'plexon');
}

function getDefaultStatus(defaultAccess: 'granted' | 'hidden') {
  return defaultAccess === 'granted'
    ? PLATFORM_ENTITLEMENT_STATUS.ACTIVE
    : PLATFORM_ENTITLEMENT_STATUS.DISABLED;
}

function buildProvisioningSummary(
  product: Awaited<ReturnType<typeof getManagedPlatformProductsForUser>>[number]
) {
  const status = product.entitlement?.status ?? getDefaultStatus(product.defaultAccess);
  const desiredState = getProvisioningDesiredState(status);
  return {
    desiredState,
    syncStatus:
      product.provisioning?.syncStatus ??
      (desiredState === 'disabled'
        ? PLATFORM_PROVISIONING_SYNC_STATUS.DISABLED
        : PLATFORM_PROVISIONING_SYNC_STATUS.PENDING),
    syncMessage: product.provisioning?.syncMessage ?? null,
    lastAttemptAt: product.provisioning?.lastAttemptAt?.toISOString() ?? null,
    lastSucceededAt: product.provisioning?.lastSucceededAt?.toISOString() ?? null,
    externalUserRef: product.provisioning?.externalUserRef ?? null,
  };
}

function isValidEntryPoint(productId: string, entryPointId: string | null | undefined) {
  if (!entryPointId) return true;
  const product = getManageableProductDefinitions().find((item) => item.id === productId);
  return product ? product.entryPoints.some((entryPoint) => entryPoint.id === entryPointId) : false;
}

function normalizeProjectId(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function ensureUserExists(userId: string) {
  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const user = await ensureUserExists(id);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);

  const products = await getManagedPlatformProductsForUser(id, admin.role);
  const manageableIds = new Set(getManageableProductDefinitions().map((product) => product.id));

  const platformProjectAssignments = await listUserPlatformProjectAssignments(id);

  return Response.json({
    userId: id,
    platformProjectAssignments: platformProjectAssignments.map((a) => ({
      platformProjectId: a.platformProjectId,
      role: a.role,
    })),
    items: products
      .filter((product) => manageableIds.has(product.productId))
      .map((product) => ({
        productId: product.productId,
        name: product.name,
        lifecycle: product.lifecycle,
        surface: product.surface,
        defaultAccess: product.defaultAccess,
        source: product.entitlement ? 'explicit' : 'default',
        entryPoints: product.entryPoints,
        status: product.entitlement?.status ?? getDefaultStatus(product.defaultAccess),
        platformRole: product.entitlement?.platformRole ?? PLATFORM_ROLE.MEMBER,
        defaultContext: product.entitlement?.defaultContext ?? null,
        projectAssignments: product.projectAssignments ?? [],
        provisioning: buildProvisioningSummary(product),
      })),
  });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const user = await ensureUserExists(id);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  if (!Array.isArray(body.items)) {
    return apiError('items must be an array', API_STATUS.BAD_REQUEST);
  }

  const manageableProducts = getManageableProductDefinitions();
  const manageableIds = new Set(manageableProducts.map((product) => product.id));
  const nextItems: ManagedPlatformEntitlementInput[] = [];
  const nextProjectAssignments: ManagedPlatformProjectAssignmentInput[] = [];
  let nextPlatformProjectAssignments: Array<{
    platformProjectId: string;
    role: ManagedPlatformProjectAssignmentInput['role'];
  }> | null = null;

  if (body.platformProjectAssignments !== undefined) {
    if (!Array.isArray(body.platformProjectAssignments)) {
      return apiError('platformProjectAssignments must be an array', API_STATUS.BAD_REQUEST);
    }
    nextPlatformProjectAssignments = [];
    const seenPlatform = new Set<string>();
    for (const raw of body.platformProjectAssignments) {
      if (!raw || typeof raw !== 'object') {
        return apiError('Each platform project assignment must be an object', API_STATUS.BAD_REQUEST);
      }
      const row = raw as Record<string, unknown>;
      const platformProjectId = normalizeProjectId(row.platformProjectId);
      if (!platformProjectId) {
        return apiError('Invalid platformProjectId', API_STATUS.BAD_REQUEST);
      }
      if (!isPlatformProjectAssignmentRole(row.role)) {
        return apiError('Invalid role in platform project assignment', API_STATUS.BAD_REQUEST);
      }
      if (seenPlatform.has(platformProjectId)) {
        return apiError('Duplicate platformProjectId', API_STATUS.BAD_REQUEST);
      }
      seenPlatform.add(platformProjectId);
      nextPlatformProjectAssignments.push({ platformProjectId, role: row.role });
    }
  }

  for (const rawItem of body.items) {
    if (!rawItem || typeof rawItem !== 'object') {
      return apiError('Each entitlement item must be an object', API_STATUS.BAD_REQUEST);
    }
    const item = rawItem as Record<string, unknown>;
    if (!isPlatformProductId(item.productId) || !manageableIds.has(item.productId)) {
      return apiError('Invalid productId', API_STATUS.BAD_REQUEST);
    }
    if (!isPlatformEntitlementStatus(item.status)) {
      return apiError('Invalid entitlement status', API_STATUS.BAD_REQUEST);
    }
    if (!isPlatformRole(item.platformRole)) {
      return apiError('Invalid platformRole', API_STATUS.BAD_REQUEST);
    }

    const defaultContext = normalizePlatformLaunchContext(item.defaultContext);
    if (defaultContext?.entryPointId && !isValidEntryPoint(item.productId, defaultContext.entryPointId)) {
      return apiError('Invalid entryPointId for product', API_STATUS.BAD_REQUEST);
    }

    nextItems.push({
      productId: item.productId,
      status: item.status,
      platformRole: item.platformRole,
      defaultContext,
    });

    if (item.projectAssignments !== undefined) {
      if (!Array.isArray(item.projectAssignments)) {
        return apiError('projectAssignments must be an array', API_STATUS.BAD_REQUEST);
      }
      if (!['audion', 'checkion'].includes(item.productId) && item.projectAssignments.length > 0) {
        return apiError('Project assignments are only supported for AUDION and CHECKION', API_STATUS.BAD_REQUEST);
      }
      const seenAssignments = new Set<string>();
      for (const rawAssignment of item.projectAssignments) {
        if (!rawAssignment || typeof rawAssignment !== 'object') {
          return apiError('Each project assignment must be an object', API_STATUS.BAD_REQUEST);
        }
        const assignment = rawAssignment as Record<string, unknown>;
        const projectId = normalizeProjectId(assignment.projectId);
        if (!projectId) {
          return apiError('Invalid projectId in project assignment', API_STATUS.BAD_REQUEST);
        }
        if (!isPlatformProjectAssignmentRole(assignment.role)) {
          return apiError('Invalid role in project assignment', API_STATUS.BAD_REQUEST);
        }
        if (seenAssignments.has(projectId)) {
          return apiError('Duplicate projectId in project assignments', API_STATUS.BAD_REQUEST);
        }
        seenAssignments.add(projectId);
        nextProjectAssignments.push({
          productId: item.productId,
          projectId,
          role: assignment.role,
        });
      }
    }
  }

  const seen = new Set<string>();
  for (const item of nextItems) {
    if (seen.has(item.productId)) {
      return apiError('Duplicate productId in entitlement payload', API_STATUS.BAD_REQUEST);
    }
    seen.add(item.productId);
  }

  const saved = await replaceUserProductEntitlements(id, nextItems);
  const savedProjectAssignments = await replaceUserProductProjectAssignments(id, nextProjectAssignments);
  const savedPlatformProjectAssignments =
    nextPlatformProjectAssignments !== null
      ? await replaceUserPlatformProjectAssignments(id, nextPlatformProjectAssignments)
      : await listUserPlatformProjectAssignments(id);
  const projectAssignmentsByProduct = savedProjectAssignments.reduce<
    Partial<Record<string, { projectId: string; role: ManagedPlatformProjectAssignmentInput['role'] }[]>>
  >((acc, assignment) => {
    if (!acc[assignment.productId]) {
      acc[assignment.productId] = [];
    }
    acc[assignment.productId]?.push({
      projectId: assignment.projectId,
      role: assignment.role,
    });
    return acc;
  }, {});
  const syncedProvisioning = await syncUserProductProvisioning(id, {
    force: true,
    source: 'plexon-admin-entitlements',
  });
  const provisioningMap = new Map(syncedProvisioning.map((item) => [item.productId, item]));

  return Response.json({
    userId: id,
    platformProjectAssignments: savedPlatformProjectAssignments.map((a) => ({
      platformProjectId: a.platformProjectId,
      role: a.role,
    })),
    items: saved.map((item) => ({
      productId: item.productId,
      status: item.status,
      platformRole: item.platformRole,
      defaultContext: item.defaultContext,
      projectAssignments: projectAssignmentsByProduct[item.productId] ?? [],
      updatedAt: item.updatedAt.toISOString(),
      provisioning: provisioningMap.get(item.productId)
        ? {
            desiredState: provisioningMap.get(item.productId)?.desiredState,
            syncStatus: provisioningMap.get(item.productId)?.syncStatus,
            syncMessage: provisioningMap.get(item.productId)?.syncMessage ?? null,
            lastAttemptAt:
              provisioningMap.get(item.productId)?.lastAttemptAt?.toISOString() ?? null,
            lastSucceededAt:
              provisioningMap.get(item.productId)?.lastSucceededAt?.toISOString() ?? null,
            externalUserRef: provisioningMap.get(item.productId)?.externalUserRef ?? null,
          }
        : null,
    })),
  });
}
