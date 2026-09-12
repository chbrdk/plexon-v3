import { isPlatformProductId, type PlatformProductId } from '@/lib/platform-entitlements';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import {
  syncPlatformProjectToProducts,
  type SyncPlatformProjectResult,
} from '@/lib/platform-project-sync-service';
import {
  decodeAccessibleCollectionsCursor,
} from '@/lib/list-accessible-collections';

/** Products that receive Collection capability mirrors (not plexon/videon). */
const MIRROR_PRODUCTS: PlatformProductId[] = ['checkion', 'audion', 'brandion', 'creation', 'spirion'];

export const SYNC_ACCESSIBLE_MIRRORS_CAP = 50;

export type SyncAccessibleCapabilityMirrorsResult = {
  userId: string;
  productIds: PlatformProductId[];
  totalAccessible: number;
  synced: number;
  truncated: boolean;
  nextCursor: string | null;
  limit: number;
  results: SyncPlatformProjectResult[];
};

function resolveProductFilter(raw: unknown): PlatformProductId[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...MIRROR_PRODUCTS];
  const selected = raw.filter(
    (id): id is PlatformProductId =>
      isPlatformProductId(id) && MIRROR_PRODUCTS.includes(id as PlatformProductId)
  );
  return selected.length > 0 ? selected : [...MIRROR_PRODUCTS];
}

function clampLimit(limit: unknown): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return SYNC_ACCESSIBLE_MIRRORS_CAP;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

function encodeCursor(name: string, id: string): string {
  return Buffer.from(`${name}\0${id}`, 'utf8').toString('base64url');
}

/**
 * Upsert capability mirrors for Collections the user can see.
 * Supports cursor pagination (Wave B) — default page size {@link SYNC_ACCESSIBLE_MIRRORS_CAP}.
 */
export async function syncAccessibleCapabilityMirrors(
  userId: string,
  options: {
    productIds?: unknown;
    source?: string;
    limit?: unknown;
    cursor?: unknown;
  } = {}
): Promise<SyncAccessibleCapabilityMirrorsResult> {
  const productIds = resolveProductFilter(options.productIds);
  const source = options.source ?? 'plexon-sync-accessible-mirrors';
  const limit = clampLimit(options.limit);
  const cursor =
    typeof options.cursor === 'string'
      ? decodeAccessibleCollectionsCursor(options.cursor)
      : null;

  const accessible = await listAccessiblePlatformProjectsForUser(userId);
  let start = 0;
  if (cursor) {
    const idx = accessible.findIndex(
      (p) =>
        p.name.localeCompare(cursor.name, undefined, { sensitivity: 'base' }) > 0 ||
        (p.name.localeCompare(cursor.name, undefined, { sensitivity: 'base' }) === 0 &&
          p.id > cursor.id)
    );
    start = idx < 0 ? accessible.length : idx;
  }

  const slice = accessible.slice(start, start + limit);
  const hasMore = start + limit < accessible.length;
  const last = slice[slice.length - 1];

  const results: SyncPlatformProjectResult[] = [];
  for (const project of slice) {
    const batch = await syncPlatformProjectToProducts(project.id, {
      source,
      onlyProducts: productIds,
    });
    results.push(...batch);
  }

  return {
    userId,
    productIds,
    totalAccessible: accessible.length,
    synced: slice.length,
    truncated: hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.name, last.id) : null,
    limit,
    results,
  };
}
