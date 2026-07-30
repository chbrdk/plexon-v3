import {
  PLATFORM_PROJECT_BINDING_SYNC_STATUS,
  PLATFORM_PROJECT_STATUS,
} from '@/lib/platform-companies';
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import {
  ensureBindingPlaceholders,
  upsertPlatformProjectBinding,
} from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { pushPlatformProjectUpsert } from '@/lib/platform-project-upsert';

const PRODUCTS: PlatformProductId[] = ['checkion', 'audion'];

export type SyncPlatformProjectResult = {
  platformProjectId: string;
  productId: PlatformProductId;
  ok: boolean;
  externalProjectId?: string | null;
  error?: string;
};

/**
 * Ensures local CHECKION/AUDION projects exist and updates PLEXON bindings.
 * @param options.onlyProducts — when set, only these products are upserted (e.g. `['checkion']` when AUDION already has the project row).
 */
export async function syncPlatformProjectToProducts(
  platformProjectId: string,
  options: { source?: string; onlyProducts?: PlatformProductId[] } = {}
): Promise<SyncPlatformProjectResult[]> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) {
    throw new Error('Platform project not found');
  }

  await ensureBindingPlaceholders(platformProjectId);

  if (!project.createdByUserId) {
    throw new Error('Platform project has no createdByUserId; set owner before sync');
  }
  const ownerUserId = project.createdByUserId;

  const statusNorm: 'active' | 'archived' =
    project.status === PLATFORM_PROJECT_STATUS.ARCHIVED ? 'archived' : 'active';

  const results: SyncPlatformProjectResult[] = [];
  const source = options.source ?? 'plexon-platform-project-sync';
  const productLoop = options.onlyProducts?.length ? options.onlyProducts : PRODUCTS;

  for (const productId of productLoop) {
    const remote = await pushPlatformProjectUpsert(productId, platformProjectId, {
      platformCompanyId: project.companyId,
      name: project.name,
      domain: project.domain,
      status: statusNorm,
      ownerUserId,
      contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
      source,
      requestedAt: new Date().toISOString(),
    });

    if (!remote.supported) {
      await upsertPlatformProjectBinding({
        platformProjectId,
        productId,
        externalProjectId: null,
        syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.FAILED,
        syncMessage: remote.error ?? 'unsupported',
        lastSyncAt: new Date(),
      });
      results.push({ platformProjectId, productId, ok: false, error: remote.error });
      continue;
    }

    if (!remote.ok || !remote.data?.externalProjectId) {
      const msg = remote.error ?? remote.data?.details ?? 'upsert failed';
      await upsertPlatformProjectBinding({
        platformProjectId,
        productId,
        externalProjectId: null,
        syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.FAILED,
        syncMessage: msg,
        lastSyncAt: new Date(),
      });
      results.push({ platformProjectId, productId, ok: false, error: msg });
      continue;
    }

    await upsertPlatformProjectBinding({
      platformProjectId,
      productId,
      externalProjectId: remote.data.externalProjectId,
      syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
      syncMessage: null,
      lastSyncAt: new Date(),
    });
    results.push({
      platformProjectId,
      productId,
      ok: true,
      externalProjectId: remote.data.externalProjectId,
    });
  }

  return results;
}
