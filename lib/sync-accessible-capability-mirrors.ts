import { isPlatformProductId, type PlatformProductId } from '@/lib/platform-entitlements';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import {
  syncPlatformProjectToProducts,
  type SyncPlatformProjectResult,
} from '@/lib/platform-project-sync-service';

/** Products that receive Collection capability mirrors (not plexon/videon). */
const MIRROR_PRODUCTS: PlatformProductId[] = ['checkion', 'audion', 'brandion', 'creation', 'spirion'];

export const SYNC_ACCESSIBLE_MIRRORS_CAP = 50;

export type SyncAccessibleCapabilityMirrorsResult = {
  userId: string;
  productIds: PlatformProductId[];
  totalAccessible: number;
  synced: number;
  truncated: boolean;
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

/**
 * Upsert capability mirrors for every Collection the user can see
 * (company membership + assignments). Caps at {@link SYNC_ACCESSIBLE_MIRRORS_CAP}.
 */
export async function syncAccessibleCapabilityMirrors(
  userId: string,
  options: { productIds?: unknown; source?: string } = {}
): Promise<SyncAccessibleCapabilityMirrorsResult> {
  const productIds = resolveProductFilter(options.productIds);
  const source = options.source ?? 'plexon-sync-accessible-mirrors';
  const accessible = await listAccessiblePlatformProjectsForUser(userId);
  const truncated = accessible.length > SYNC_ACCESSIBLE_MIRRORS_CAP;
  const slice = accessible.slice(0, SYNC_ACCESSIBLE_MIRRORS_CAP);

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
    truncated,
    results,
  };
}
