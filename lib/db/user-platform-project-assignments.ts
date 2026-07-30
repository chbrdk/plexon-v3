import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { userPlatformProjectAssignments } from './schema';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import type { PlatformProjectAssignmentRole } from '@/lib/platform-provisioning';
import { getExternalProjectId } from './platform-project-bindings';
import type { ManagedPlatformProjectAssignmentInput, StoredPlatformProjectAssignment } from '@/lib/platform-provisioning';

export type StoredUserPlatformProjectAssignment = {
  userId: string;
  platformProjectId: string;
  role: PlatformProjectAssignmentRole;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(
  row: typeof userPlatformProjectAssignments.$inferSelect
): StoredUserPlatformProjectAssignment {
  return {
    userId: row.userId,
    platformProjectId: row.platformProjectId,
    role: row.role as PlatformProjectAssignmentRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUserPlatformProjectAssignments(
  userId: string
): Promise<StoredUserPlatformProjectAssignment[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPlatformProjectAssignments)
    .where(eq(userPlatformProjectAssignments.userId, userId));
  return rows.map(mapRow);
}

export async function getUserPlatformProjectAssignment(
  userId: string,
  platformProjectId: string
): Promise<StoredUserPlatformProjectAssignment | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(userPlatformProjectAssignments)
    .where(
      and(
        eq(userPlatformProjectAssignments.userId, userId),
        eq(userPlatformProjectAssignments.platformProjectId, platformProjectId)
      )
    )
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function upsertUserPlatformProjectAssignment(
  userId: string,
  platformProjectId: string,
  role: PlatformProjectAssignmentRole
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const existing = await getUserPlatformProjectAssignment(userId, platformProjectId);
  if (existing) {
    if (existing.role !== role) {
      await db
        .update(userPlatformProjectAssignments)
        .set({ role, updatedAt: now })
        .where(
          and(
            eq(userPlatformProjectAssignments.userId, userId),
            eq(userPlatformProjectAssignments.platformProjectId, platformProjectId)
          )
        );
    }
    return;
  }
  await db.insert(userPlatformProjectAssignments).values({
    userId,
    platformProjectId,
    role,
    createdAt: now,
    updatedAt: now,
  });
}

export async function replaceUserPlatformProjectAssignments(
  userId: string,
  items: Array<{ platformProjectId: string; role: PlatformProjectAssignmentRole }>
): Promise<StoredUserPlatformProjectAssignment[]> {
  const db = getDb();
  const now = new Date();

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(userPlatformProjectAssignments)
      .where(eq(userPlatformProjectAssignments.userId, userId));
    const existingMap = new Map(
      existingRows.map((row) => [row.platformProjectId, row])
    );
    const nextIds = new Set(items.map((item) => item.platformProjectId));

    for (const item of items) {
      const existing = existingMap.get(item.platformProjectId);
      if (!existing) {
        await tx.insert(userPlatformProjectAssignments).values({
          userId,
          platformProjectId: item.platformProjectId,
          role: item.role,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }
      if (existing.role !== item.role) {
        await tx
          .update(userPlatformProjectAssignments)
          .set({ role: item.role, updatedAt: now })
          .where(
            and(
              eq(userPlatformProjectAssignments.userId, userId),
              eq(userPlatformProjectAssignments.platformProjectId, item.platformProjectId)
            )
          );
      }
    }

    for (const existing of existingRows) {
      if (!nextIds.has(existing.platformProjectId)) {
        await tx
          .delete(userPlatformProjectAssignments)
          .where(
            and(
              eq(userPlatformProjectAssignments.userId, userId),
              eq(userPlatformProjectAssignments.platformProjectId, existing.platformProjectId)
            )
          );
      }
    }

    const savedRows = await tx
      .select()
      .from(userPlatformProjectAssignments)
      .where(eq(userPlatformProjectAssignments.userId, userId));
    return savedRows.map(mapRow);
  });
}

const MANAGED_PRODUCTS: PlatformProductId[] = ['checkion', 'audion'];

/**
 * Expands platform-project assignments + legacy per-product rows into provisioning payloads.
 */
export async function expandAssignmentsForProvisioning(
  userId: string,
  legacyAssignments: StoredPlatformProjectAssignment[]
): Promise<ManagedPlatformProjectAssignmentInput[]> {
  const platformRows = await listUserPlatformProjectAssignments(userId);
  const out: ManagedPlatformProjectAssignmentInput[] = [];

  for (const row of platformRows) {
    for (const productId of MANAGED_PRODUCTS) {
      const externalId = await getExternalProjectId(row.platformProjectId, productId);
      if (externalId) {
        out.push({
          productId,
          projectId: externalId,
          role: row.role,
        });
      }
    }
  }

  for (const legacy of legacyAssignments) {
    if (legacy.userId !== userId) continue;
    out.push({
      productId: legacy.productId,
      projectId: legacy.projectId,
      role: legacy.role,
    });
  }

  const dedupe = new Map<string, ManagedPlatformProjectAssignmentInput>();
  for (const item of out) {
    const key = `${item.productId}:${item.projectId}`;
    dedupe.set(key, item);
  }
  return [...dedupe.values()];
}
