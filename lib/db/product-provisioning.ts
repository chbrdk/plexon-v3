import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { userProductProvisioning } from './schema';
import type {
  ManagedPlatformProvisioningInput,
  PlatformProvisioningDesiredState,
  PlatformProvisioningSyncStatus,
  StoredPlatformProvisioning,
} from '@/lib/platform-provisioning';
import type { PlatformProductId } from '@/lib/platform-entitlements';

function mapRow(row: typeof userProductProvisioning.$inferSelect): StoredPlatformProvisioning {
  return {
    userId: row.userId,
    productId: row.productId as PlatformProductId,
    desiredState: row.desiredState as PlatformProvisioningDesiredState,
    syncStatus: row.syncStatus as PlatformProvisioningSyncStatus,
    syncMessage: row.syncMessage ?? null,
    lastAttemptAt: row.lastAttemptAt ?? null,
    lastSucceededAt: row.lastSucceededAt ?? null,
    lastSourceHash: row.lastSourceHash ?? null,
    externalUserRef: row.externalUserRef ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUserProductProvisioning(userId: string): Promise<StoredPlatformProvisioning[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userProductProvisioning)
    .where(eq(userProductProvisioning.userId, userId));
  return rows.map(mapRow);
}

export async function getUserProductProvisioningMap(
  userId: string
): Promise<Partial<Record<PlatformProductId, StoredPlatformProvisioning>>> {
  const rows = await listUserProductProvisioning(userId);
  const map: Partial<Record<PlatformProductId, StoredPlatformProvisioning>> = {};
  for (const row of rows) {
    map[row.productId] = row;
  }
  return map;
}

export async function upsertUserProductProvisioning(
  userId: string,
  item: ManagedPlatformProvisioningInput
): Promise<StoredPlatformProvisioning> {
  const db = getDb();
  const now = new Date();
  const [existing] = await db
    .select()
    .from(userProductProvisioning)
    .where(
      and(
        eq(userProductProvisioning.userId, userId),
        eq(userProductProvisioning.productId, item.productId)
      )
    )
    .limit(1);

  if (!existing) {
    const [inserted] = await db
      .insert(userProductProvisioning)
      .values({
        userId,
        productId: item.productId,
        desiredState: item.desiredState,
        syncStatus: item.syncStatus,
        syncMessage: item.syncMessage ?? null,
        lastAttemptAt: item.lastAttemptAt ?? null,
        lastSucceededAt: item.lastSucceededAt ?? null,
        lastSourceHash: item.lastSourceHash ?? null,
        externalUserRef: item.externalUserRef ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return mapRow(inserted);
  }

  const [updated] = await db
    .update(userProductProvisioning)
    .set({
      desiredState: item.desiredState,
      syncStatus: item.syncStatus,
      syncMessage: item.syncMessage ?? null,
      lastAttemptAt: item.lastAttemptAt ?? null,
      lastSucceededAt: item.lastSucceededAt ?? null,
      lastSourceHash: item.lastSourceHash ?? null,
      externalUserRef: item.externalUserRef ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(userProductProvisioning.userId, userId),
        eq(userProductProvisioning.productId, item.productId)
      )
    )
    .returning();

  return mapRow(updated);
}
