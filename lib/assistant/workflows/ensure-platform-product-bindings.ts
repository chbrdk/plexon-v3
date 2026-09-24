import { getProjectBindingIds } from '@/lib/assistant/workflows/create-platform-project';
import { healAudionBindingFromProduct } from '@/lib/assistant/workflows/heal-audion-binding';
import { getPlatformProjectById, updatePlatformProject } from '@/lib/db/platform-projects';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import {
  syncPlatformProjectToProducts,
  type SyncPlatformProjectResult,
} from '@/lib/platform-project-sync-service';

export type EnsurePlatformBindingsResult = {
  checkionProjectId: string | null;
  audionProjectId: string | null;
  syncResults: SyncPlatformProjectResult[];
  missingRequired: PlatformProductId[];
  domainPatched: boolean;
  /** True when Audion binding was restored from product GET (not sync PUT). */
  audionHealed?: boolean;
};

function missingProducts(input: {
  required: PlatformProductId[];
  checkionProjectId: string | null;
  audionProjectId: string | null;
}): PlatformProductId[] {
  const missing: PlatformProductId[] = [];
  if (input.required.includes('audion') && !input.audionProjectId) missing.push('audion');
  if (input.required.includes('checkion') && !input.checkionProjectId) missing.push('checkion');
  return missing;
}

/**
 * Ensures CHECKION/AUDION bindings exist for a platform project.
 * AUDION is synced first — required for Quick Check persona + GEO questions.
 * When sync leaves Audion unbound, heals from Audion GET (resolve existing mirror).
 */
export async function ensurePlatformProductBindings(
  platformProjectId: string,
  options: {
    source?: string;
    domain?: string | null;
    required?: PlatformProductId[];
    /** Actor for Audion heal GET (falls back to Collection creator). */
    plexonUserId?: string | null;
  } = {}
): Promise<EnsurePlatformBindingsResult> {
  const required = options.required ?? ['audion', 'checkion'];
  const source = options.source ?? 'plexon-ensure-bindings';
  const syncResults: SyncPlatformProjectResult[] = [];
  let domainPatched = false;
  let audionHealed = false;

  const domain = options.domain?.trim();
  if (domain) {
    const project = await getPlatformProjectById(platformProjectId);
    if (project && !project.domain?.trim()) {
      await updatePlatformProject(platformProjectId, { domain });
      domainPatched = true;
    }
  }

  let { checkionProjectId, audionProjectId } = await getProjectBindingIds(platformProjectId);

  const syncMissing = async (products: PlatformProductId[]) => {
    if (products.length === 0) return;
    const priority: PlatformProductId[] = products.includes('audion')
      ? ['audion', ...products.filter((p) => p !== 'audion')]
      : products;
    for (const productId of [...new Set(priority)]) {
      syncResults.push(
        ...(await syncPlatformProjectToProducts(platformProjectId, {
          source,
          onlyProducts: [productId],
        }))
      );
      ({ checkionProjectId, audionProjectId } = await getProjectBindingIds(platformProjectId));
    }
  };

  let missing = missingProducts({ required, checkionProjectId, audionProjectId });
  await syncMissing(missing);

  missing = missingProducts({ required, checkionProjectId, audionProjectId });
  if (missing.length > 0) {
    syncResults.push(...(await syncPlatformProjectToProducts(platformProjectId, { source })));
    ({ checkionProjectId, audionProjectId } = await getProjectBindingIds(platformProjectId));
    missing = missingProducts({ required, checkionProjectId, audionProjectId });
  }

  // Asymmetric link: Audion already mirrors this Collection but binding row is empty.
  if (required.includes('audion') && !audionProjectId) {
    const heal = await healAudionBindingFromProduct(platformProjectId, {
      plexonUserId: options.plexonUserId,
      source: `${source}-heal`,
    });
    if (heal.healed) {
      audionProjectId = heal.audionProjectId;
      audionHealed = true;
      missing = missingProducts({ required, checkionProjectId, audionProjectId });
    }
  }

  return {
    checkionProjectId,
    audionProjectId,
    syncResults,
    missingRequired: missing,
    domainPatched,
    audionHealed,
  };
}
