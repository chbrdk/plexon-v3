import {
  PLATFORM_PROJECT_STATUS,
  type PlatformProjectStatus,
} from '@/lib/platform-companies';
import {
  deletePlatformProject,
  getPlatformProjectById,
  updatePlatformProject,
} from '@/lib/db/platform-projects';
import {
  syncPlatformProjectToProducts,
  type SyncPlatformProjectResult,
} from '@/lib/platform-project-sync-service';

export type PlatformProjectLifecycleResult = {
  project: NonNullable<Awaited<ReturnType<typeof getPlatformProjectById>>>;
  syncResults: SyncPlatformProjectResult[];
};

/**
 * Sets Collection status and fans out via product upsert (active | archived).
 */
export async function setPlatformProjectLifecycleStatus(
  platformProjectId: string,
  status: PlatformProjectStatus,
  options: { source?: string } = {}
): Promise<PlatformProjectLifecycleResult> {
  const existing = await getPlatformProjectById(platformProjectId);
  if (!existing) {
    throw new Error('Platform project not found');
  }

  if (existing.status !== status) {
    await updatePlatformProject(platformProjectId, { status });
  }

  const syncResults = await syncPlatformProjectToProducts(platformProjectId, {
    source: options.source ?? 'plexon-platform-project-lifecycle',
  });
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) {
    throw new Error('Platform project missing after status update');
  }
  return { project, syncResults };
}

/**
 * Admin hard-delete: enqueue capability tombstone, best-effort archive+sync, then cascade-delete.
 * Spec: collection-projects.md Phase 5 · platform-outbox-delivery.md Wave D
 */
export async function hardDeletePlatformProjectAfterArchive(
  platformProjectId: string,
  options: { source?: string } = {}
): Promise<{ syncResults: SyncPlatformProjectResult[]; deleted: true; tombstoneId?: string }> {
  const existing = await getPlatformProjectById(platformProjectId);
  if (!existing) {
    throw new Error('Platform project not found');
  }

  const source = options.source ?? 'plexon-admin-hard-delete';
  let tombstoneId: string | undefined;
  try {
    const { enqueueCapabilityTombstone, snapshotBindingsForTombstone } = await import(
      '@/lib/platform-outbox'
    );
    const products = await snapshotBindingsForTombstone(platformProjectId);
    tombstoneId = await enqueueCapabilityTombstone({
      platformProjectId,
      products,
      source,
    });
  } catch {
    tombstoneId = undefined;
  }

  let syncResults: SyncPlatformProjectResult[] = [];
  try {
    if (existing.status !== PLATFORM_PROJECT_STATUS.ARCHIVED) {
      await updatePlatformProject(platformProjectId, {
        status: PLATFORM_PROJECT_STATUS.ARCHIVED,
      });
    }
    syncResults = await syncPlatformProjectToProducts(platformProjectId, {
      source,
    });
  } catch {
    syncResults = [];
  }

  await deletePlatformProject(platformProjectId);
  return { syncResults, deleted: true, tombstoneId };
}
