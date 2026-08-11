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
 * Admin hard-delete: best-effort archive+sync, then cascade-delete Plexon row.
 * Product mirrors remain archived orphans (no product DELETE).
 */
export async function hardDeletePlatformProjectAfterArchive(
  platformProjectId: string,
  options: { source?: string } = {}
): Promise<{ syncResults: SyncPlatformProjectResult[]; deleted: true }> {
  const existing = await getPlatformProjectById(platformProjectId);
  if (!existing) {
    throw new Error('Platform project not found');
  }

  let syncResults: SyncPlatformProjectResult[] = [];
  try {
    if (existing.status !== PLATFORM_PROJECT_STATUS.ARCHIVED) {
      await updatePlatformProject(platformProjectId, {
        status: PLATFORM_PROJECT_STATUS.ARCHIVED,
      });
    }
    syncResults = await syncPlatformProjectToProducts(platformProjectId, {
      source: options.source ?? 'plexon-admin-hard-delete',
    });
  } catch {
    // Best-effort: still delete Plexon row so admin teardown cannot be blocked by a product outage.
    syncResults = [];
  }

  await deletePlatformProject(platformProjectId);
  return { syncResults, deleted: true };
}
