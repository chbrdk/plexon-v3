/**
 * Heal asymmetric Audion binding: Audion already has platformProjectId but
 * Plexon `platform_project_product_bindings.audion` is still null.
 * Spec / knowledge: knowledge/audion-binding-heal.md
 */

import {
  ensureBindingPlaceholders,
  upsertPlatformProjectBinding,
} from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';
import { fetchAudionPlatformProjectSummary } from '@/lib/platform-project-dashboard-fetch';

export type HealAudionBindingResult =
  | { healed: true; audionProjectId: string }
  | { healed: false; audionProjectId: null };

/**
 * GET Audion federation mirror for the Collection and write the binding when found.
 * Uses `plexonUserId` or falls back to Collection `createdByUserId` as X-Plexon-User-Id.
 */
export async function healAudionBindingFromProduct(
  platformProjectId: string,
  options: { plexonUserId?: string | null; source?: string } = {}
): Promise<HealAudionBindingResult> {
  const ppId = platformProjectId.trim();
  if (!ppId) return { healed: false, audionProjectId: null };

  const project = await getPlatformProjectById(ppId);
  const actor =
    options.plexonUserId?.trim() || project?.createdByUserId?.trim() || '';
  if (!actor) return { healed: false, audionProjectId: null };

  const summary = await fetchAudionPlatformProjectSummary(ppId, actor);
  const externalId = summary?.externalProjectId?.trim() || '';
  if (!externalId) return { healed: false, audionProjectId: null };

  await ensureBindingPlaceholders(ppId);
  await upsertPlatformProjectBinding({
    platformProjectId: ppId,
    productId: 'audion',
    externalProjectId: externalId,
    syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
    syncMessage: options.source ?? 'plexon-audion-binding-heal',
    lastSyncAt: new Date(),
  });

  return { healed: true, audionProjectId: externalId };
}
