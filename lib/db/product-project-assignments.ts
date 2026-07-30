import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { userProductProjectAssignments } from './schema';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import type {
  ManagedPlatformProjectAssignmentInput,
  StoredPlatformProjectAssignment,
} from '@/lib/platform-provisioning';

function mapRow(
  row: typeof userProductProjectAssignments.$inferSelect
): StoredPlatformProjectAssignment {
  return {
    userId: row.userId,
    productId: row.productId as PlatformProductId,
    projectId: row.externalProjectId,
    role: row.role as StoredPlatformProjectAssignment['role'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUserProductProjectAssignments(
  userId: string
): Promise<StoredPlatformProjectAssignment[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userProductProjectAssignments)
    .where(eq(userProductProjectAssignments.userId, userId));
  return rows.map(mapRow);
}

export async function getUserProductProjectAssignmentsMap(userId: string) {
  const rows = await listUserProductProjectAssignments(userId);
  const map: Partial<Record<PlatformProductId, StoredPlatformProjectAssignment[]>> = {};
  for (const row of rows) {
    if (!map[row.productId]) {
      map[row.productId] = [];
    }
    map[row.productId]?.push(row);
  }
  return map;
}

export async function replaceUserProductProjectAssignments(
  userId: string,
  items: ManagedPlatformProjectAssignmentInput[]
): Promise<StoredPlatformProjectAssignment[]> {
  const db = getDb();
  const now = new Date();

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(userProductProjectAssignments)
      .where(eq(userProductProjectAssignments.userId, userId));
    const existingMap = new Map(
      existingRows.map((row) => [`${row.productId}:${row.externalProjectId}`, row])
    );
    const nextKeys = new Set(items.map((item) => `${item.productId}:${item.projectId}`));

    for (const item of items) {
      const key = `${item.productId}:${item.projectId}`;
      const existing = existingMap.get(key);
      if (!existing) {
        await tx.insert(userProductProjectAssignments).values({
          userId,
          productId: item.productId,
          externalProjectId: item.projectId,
          role: item.role,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }

      if (existing.role !== item.role) {
        await tx
          .update(userProductProjectAssignments)
          .set({
            role: item.role,
            updatedAt: now,
          })
          .where(
            and(
              eq(userProductProjectAssignments.userId, userId),
              eq(userProductProjectAssignments.productId, item.productId),
              eq(userProductProjectAssignments.externalProjectId, item.projectId)
            )
          );
      }
    }

    for (const existing of existingRows) {
      const key = `${existing.productId}:${existing.externalProjectId}`;
      if (!nextKeys.has(key)) {
        await tx
          .delete(userProductProjectAssignments)
          .where(
            and(
              eq(userProductProjectAssignments.userId, userId),
              eq(userProductProjectAssignments.productId, existing.productId),
              eq(userProductProjectAssignments.externalProjectId, existing.externalProjectId)
            )
          );
      }
    }

    const savedRows = await tx
      .select()
      .from(userProductProjectAssignments)
      .where(eq(userProductProjectAssignments.userId, userId));
    return savedRows.map(mapRow);
  });
}
