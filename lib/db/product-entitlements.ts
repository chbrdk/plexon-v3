import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { userProductEntitlements } from './schema';
import type {
  ManagedPlatformEntitlementInput,
  PlatformProductId,
  StoredPlatformEntitlement,
} from '@/lib/platform-entitlements';

function mapRow(row: typeof userProductEntitlements.$inferSelect): StoredPlatformEntitlement {
  return {
    userId: row.userId,
    productId: row.productId as PlatformProductId,
    status: row.status as StoredPlatformEntitlement['status'],
    platformRole: row.platformRole as StoredPlatformEntitlement['platformRole'],
    defaultContext: row.defaultContext ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUserProductEntitlements(userId: string): Promise<StoredPlatformEntitlement[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userProductEntitlements)
    .where(eq(userProductEntitlements.userId, userId));

  return rows.map(mapRow);
}

export async function getUserProductEntitlementsMap(
  userId: string
): Promise<Partial<Record<PlatformProductId, StoredPlatformEntitlement>>> {
  const rows = await listUserProductEntitlements(userId);
  const map: Partial<Record<PlatformProductId, StoredPlatformEntitlement>> = {};
  for (const row of rows) {
    map[row.productId] = row;
  }
  return map;
}

export async function replaceUserProductEntitlements(
  userId: string,
  items: ManagedPlatformEntitlementInput[]
): Promise<StoredPlatformEntitlement[]> {
  const db = getDb();
  const now = new Date();

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(userProductEntitlements)
      .where(eq(userProductEntitlements.userId, userId));
    const existingMap = new Map(existingRows.map((row) => [row.productId, row]));
    const nextProductIds = new Set(items.map((item) => item.productId));

    for (const item of items) {
      const existing = existingMap.get(item.productId);
      if (!existing) {
        await tx.insert(userProductEntitlements).values({
          userId,
          productId: item.productId,
          status: item.status,
          platformRole: item.platformRole,
          defaultContext: item.defaultContext ?? null,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }

      const defaultContextChanged =
        JSON.stringify(existing.defaultContext ?? null) !== JSON.stringify(item.defaultContext ?? null);

      if (
        existing.status !== item.status ||
        existing.platformRole !== item.platformRole ||
        defaultContextChanged
      ) {
        await tx
          .update(userProductEntitlements)
          .set({
            status: item.status,
            platformRole: item.platformRole,
            defaultContext: item.defaultContext ?? null,
            updatedAt: now,
          })
          .where(
            and(
              eq(userProductEntitlements.userId, userId),
              eq(userProductEntitlements.productId, item.productId)
            )
          );
      }
    }

    for (const existing of existingRows) {
      if (!nextProductIds.has(existing.productId as PlatformProductId)) {
        await tx
          .delete(userProductEntitlements)
          .where(
            and(
              eq(userProductEntitlements.userId, userId),
              eq(userProductEntitlements.productId, existing.productId)
            )
          );
      }
    }

    const savedRows = await tx
      .select()
      .from(userProductEntitlements)
      .where(eq(userProductEntitlements.userId, userId));

    return savedRows.map(mapRow);
  });
}
