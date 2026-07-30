import { listBoundPlatformProjectsForProduct } from '@/lib/db/platform-product-project-options';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import {
  fetchAudionProjectsFromProductDb,
  fetchCheckionProjectsFromProductDb,
} from '@/lib/admin-product-db-catalog';

export type AdminProductProjectOption = {
  /** CHECKION / AUDION project id (stored in entitlements / provisioning). */
  projectId: string;
  platformProjectId: string | null;
  platformProjectName: string | null;
  platformProjectDomain: string | null;
};

/**
 * Options for admin UI:
 * - PLEXON platform projects with synced product bindings
 * - Legacy per-user assignments without platform mapping
 * - When `CHECKION_DATABASE_URL` / `AUDION_DATABASE_URL` (or migration aliases) are set on PLEXON,
 *   the full product project catalog is merged so CHECKION “Projekte” (scan/geo containers) always appear.
 */
export async function listAdminProductProjectPickerItems(
  userId: string,
  productId: 'checkion' | 'audion'
): Promise<AdminProductProjectOption[]> {
  const bound = await listBoundPlatformProjectsForProduct(productId);
  const byProjectId = new Map<string, AdminProductProjectOption>();

  for (const row of bound) {
    byProjectId.set(row.externalProjectId, {
      projectId: row.externalProjectId,
      platformProjectId: row.platformProjectId,
      platformProjectName: row.name,
      platformProjectDomain: row.domain,
    });
  }

  const legacy = await listUserProductProjectAssignments(userId);
  for (const row of legacy) {
    if (row.productId !== productId) continue;
    const id = row.projectId.trim();
    if (!id || byProjectId.has(id)) continue;
    byProjectId.set(id, {
      projectId: id,
      platformProjectId: null,
      platformProjectName: null,
      platformProjectDomain: null,
    });
  }

  if (productId === 'checkion') {
    const catalog = await fetchCheckionProjectsFromProductDb();
    for (const r of catalog) {
      if (byProjectId.has(r.id)) continue;
      byProjectId.set(r.id, {
        projectId: r.id,
        platformProjectId: null,
        platformProjectName: r.name,
        platformProjectDomain: r.domain,
      });
    }
  } else {
    const catalog = await fetchAudionProjectsFromProductDb();
    for (const r of catalog) {
      if (byProjectId.has(r.id)) continue;
      byProjectId.set(r.id, {
        projectId: r.id,
        platformProjectId: null,
        platformProjectName: r.name,
        platformProjectDomain: null,
      });
    }
  }

  return [...byProjectId.values()].sort((a, b) => {
    const labelA = (a.platformProjectName ?? a.projectId).toLowerCase();
    const labelB = (b.platformProjectName ?? b.projectId).toLowerCase();
    return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
  });
}
