import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import { expandAssignmentsForProvisioning } from '@/lib/db/user-platform-project-assignments';
import { getUserProductProvisioningMap, upsertUserProductProvisioning } from '@/lib/db/product-provisioning';
import { users } from '@/lib/db/schema';
import { PLATFORM_ENTITLEMENT_STATUS, PLATFORM_ROLE, type PlatformProductId } from '@/lib/platform-entitlements';
import {
  buildProvisioningSourceHash,
  getProvisioningDesiredState,
  PLATFORM_PROVISIONING_RESULT_STATUS,
  PLATFORM_PROVISIONING_SYNC_STATUS,
  type PlatformProvisioningRequestPayload,
  type StoredPlatformProvisioning,
} from '@/lib/platform-provisioning';
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract';
import { getManagedPlatformProductsForUser } from '@/lib/platform-product-registry';
import { pushPlatformProvisioning } from '@/lib/services/platform-provisioning-client';

type ProvisioningSyncOptions = {
  force?: boolean;
  productIds?: PlatformProductId[];
  source?: string;
};

type ProvisioningUser = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  avatarUrl: string | null;
  locale: string | null;
};

function getDefaultEntitlementStatus(defaultAccess: 'granted' | 'hidden') {
  return defaultAccess === 'granted'
    ? PLATFORM_ENTITLEMENT_STATUS.ACTIVE
    : PLATFORM_ENTITLEMENT_STATUS.DISABLED;
}

async function getProvisioningUser(userId: string): Promise<ProvisioningUser | null> {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

function shouldSkipProvisioning(
  current: StoredPlatformProvisioning | null,
  sourceHash: string,
  desiredState: PlatformProvisioningRequestPayload['desiredState'],
  force: boolean
) {
  if (force || !current) return false;
  if (current.lastSourceHash !== sourceHash || current.desiredState !== desiredState) return false;
  if (desiredState === 'disabled') {
    return current.syncStatus === PLATFORM_PROVISIONING_SYNC_STATUS.DISABLED;
  }
  return current.syncStatus === PLATFORM_PROVISIONING_SYNC_STATUS.IN_SYNC;
}

export async function syncUserProductProvisioning(
  userId: string,
  options: ProvisioningSyncOptions = {}
) {
  const user = await getProvisioningUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const products = (await getManagedPlatformProductsForUser(userId, null))
    .filter((product) => product.productId !== 'plexon')
    .filter((product) =>
      options.productIds && options.productIds.length > 0
        ? options.productIds.includes(product.productId)
        : true
    );
  const provisioningMap = await getUserProductProvisioningMap(userId);
  const legacyAssignments = await listUserProductProjectAssignments(userId);
  const expandedProvisioningAssignments = await expandAssignmentsForProvisioning(
    userId,
    legacyAssignments
  );

  const results: StoredPlatformProvisioning[] = [];
  for (const product of products) {
    const effectiveStatus = product.entitlement?.status ?? getDefaultEntitlementStatus(product.defaultAccess);
    const desiredState = getProvisioningDesiredState(effectiveStatus);
    const payload: PlatformProvisioningRequestPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      desiredState,
      platformRole: product.entitlement?.platformRole ?? PLATFORM_ROLE.MEMBER,
      defaultContext: product.entitlement?.defaultContext ?? null,
      projectAssignments: expandedProvisioningAssignments
        .filter((a) => a.productId === product.productId)
        .map((assignment) => ({
          projectId: assignment.projectId,
          role: assignment.role,
        })),
      contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
      source: options.source ?? 'plexon-admin-sync',
      requestedAt: new Date().toISOString(),
    };
    const sourceHash = buildProvisioningSourceHash(payload);
    const current = provisioningMap[product.productId] ?? null;

    if (shouldSkipProvisioning(current, sourceHash, desiredState, Boolean(options.force))) {
      if (current) {
        results.push(current);
      }
      continue;
    }

    const attemptedAt = new Date();
    const remote = await pushPlatformProvisioning(product.productId, payload);
    if (!remote.supported) {
      results.push(
        await upsertUserProductProvisioning(userId, {
          productId: product.productId,
          desiredState,
          syncStatus: PLATFORM_PROVISIONING_SYNC_STATUS.NOT_SUPPORTED,
          syncMessage: remote.error ?? 'Provisioning not supported for this product',
          lastAttemptAt: attemptedAt,
          lastSucceededAt: null,
          lastSourceHash: sourceHash,
          externalUserRef: current?.externalUserRef ?? null,
        })
      );
      continue;
    }

    if (!remote.ok) {
      results.push(
        await upsertUserProductProvisioning(userId, {
          productId: product.productId,
          desiredState,
          syncStatus: PLATFORM_PROVISIONING_SYNC_STATUS.FAILED,
          syncMessage: remote.error ?? 'Provisioning failed',
          lastAttemptAt: attemptedAt,
          lastSucceededAt: current?.lastSucceededAt ?? null,
          lastSourceHash: sourceHash,
          externalUserRef: current?.externalUserRef ?? null,
        })
      );
      continue;
    }

    const responseStatus = remote.data?.status;
    const syncStatus =
      desiredState === 'disabled' || responseStatus === PLATFORM_PROVISIONING_RESULT_STATUS.DISABLED
        ? PLATFORM_PROVISIONING_SYNC_STATUS.DISABLED
        : PLATFORM_PROVISIONING_SYNC_STATUS.IN_SYNC;

    results.push(
      await upsertUserProductProvisioning(userId, {
        productId: product.productId,
        desiredState,
        syncStatus,
        syncMessage: remote.data?.details ?? null,
        lastAttemptAt: attemptedAt,
        lastSucceededAt: attemptedAt,
        lastSourceHash: sourceHash,
        externalUserRef: remote.data?.externalUserRef ?? current?.externalUserRef ?? null,
      })
    );
  }

  return results;
}

/** Best-effort disable on federated products before the central user row is removed. */
export async function deprovisionUserAcrossProducts(userId: string) {
  const user = await getProvisioningUser(userId);
  if (!user) return;

  const provisioningMap = await getUserProductProvisioningMap(userId);
  const products = (await getManagedPlatformProductsForUser(userId, null)).filter(
    (product) => product.productId !== 'plexon'
  );

  for (const product of products) {
    const current = provisioningMap[product.productId];
    if (!current || current.desiredState === 'disabled') continue;

    const payload: PlatformProvisioningRequestPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      desiredState: 'disabled',
      platformRole: product.entitlement?.platformRole ?? PLATFORM_ROLE.MEMBER,
      defaultContext: null,
      projectAssignments: [],
      contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
      source: 'plexon-user-delete',
      requestedAt: new Date().toISOString(),
    };
    await pushPlatformProvisioning(product.productId, payload);
  }
}
