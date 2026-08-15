import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { platformProjectProductBindings } from './schema';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import {
  PLATFORM_PROJECT_BINDING_SYNC_STATUS,
  type PlatformProjectBindingSyncStatus,
} from '@/lib/platform-companies';

export async function upsertPlatformProjectBinding(input: {
  platformProjectId: string;
  productId: PlatformProductId;
  externalProjectId: string | null;
  syncStatus: PlatformProjectBindingSyncStatus;
  syncMessage?: string | null;
  lastSyncAt?: Date | null;
}) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(platformProjectProductBindings)
    .values({
      platformProjectId: input.platformProjectId,
      productId: input.productId,
      externalProjectId: input.externalProjectId,
      syncStatus: input.syncStatus,
      syncMessage: input.syncMessage ?? null,
      lastSyncAt: input.lastSyncAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        platformProjectProductBindings.platformProjectId,
        platformProjectProductBindings.productId,
      ],
      set: {
        externalProjectId: input.externalProjectId,
        syncStatus: input.syncStatus,
        syncMessage: input.syncMessage ?? null,
        lastSyncAt: input.lastSyncAt ?? null,
        updatedAt: now,
      },
    });
}

export async function getBindingsForPlatformProject(platformProjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(platformProjectProductBindings)
    .where(eq(platformProjectProductBindings.platformProjectId, platformProjectId));
}

export async function getExternalProjectId(
  platformProjectId: string,
  productId: PlatformProductId
): Promise<string | null> {
  const rows = await getBindingsForPlatformProject(platformProjectId);
  const match = rows.find((r) => r.productId === productId);
  return match?.externalProjectId ?? null;
}

/** Returns platform project id if a binding already exists for this product external id (dedupe). */
export async function findPlatformProjectIdByProductExternal(
  productId: PlatformProductId,
  externalProjectId: string
): Promise<string | null> {
  const id = externalProjectId.trim();
  if (!id) return null;
  const db = getDb();
  const [row] = await db
    .select({ platformProjectId: platformProjectProductBindings.platformProjectId })
    .from(platformProjectProductBindings)
    .where(
      and(
        eq(platformProjectProductBindings.productId, productId),
        eq(platformProjectProductBindings.externalProjectId, id)
      )
    )
    .limit(1);
  return row?.platformProjectId ?? null;
}

export async function ensureBindingPlaceholders(platformProjectId: string) {
  const products: PlatformProductId[] = ['checkion', 'audion', 'brandion', 'creation', 'dig'];
  const db = getDb();
  const now = new Date();
  for (const productId of products) {
    await db
      .insert(platformProjectProductBindings)
      .values({
        platformProjectId,
        productId,
        externalProjectId: null,
        syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.PENDING,
        syncMessage: null,
        lastSyncAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
}
