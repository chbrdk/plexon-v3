import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
  updatePlatformProject: vi.fn(),
  deletePlatformProject: vi.fn(),
}));

vi.mock('@/lib/platform-project-sync-service', () => ({
  syncPlatformProjectToProducts: vi.fn(),
}));

import {
  deletePlatformProject,
  getPlatformProjectById,
  updatePlatformProject,
} from '@/lib/db/platform-projects';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import {
  hardDeletePlatformProjectAfterArchive,
  setPlatformProjectLifecycleStatus,
} from '@/lib/platform-project-lifecycle';
import { PLATFORM_PROJECT_STATUS } from '@/lib/platform-companies';

const now = new Date();
const sample = (status: string) => ({
  id: 'pp-1',
  companyId: 'c1',
  name: 'Demo',
  domain: null,
  metadata: null,
  status,
  createdByUserId: 'u1',
  createdAt: now,
  updatedAt: now,
});

describe('platform-project-lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('archives then syncs products', async () => {
    vi.mocked(getPlatformProjectById)
      .mockResolvedValueOnce(sample(PLATFORM_PROJECT_STATUS.ACTIVE))
      .mockResolvedValueOnce(sample(PLATFORM_PROJECT_STATUS.ARCHIVED));
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      { platformProjectId: 'pp-1', productId: 'checkion', ok: true },
    ]);

    const result = await setPlatformProjectLifecycleStatus(
      'pp-1',
      PLATFORM_PROJECT_STATUS.ARCHIVED,
      { source: 'test' }
    );

    expect(updatePlatformProject).toHaveBeenCalledWith('pp-1', {
      status: PLATFORM_PROJECT_STATUS.ARCHIVED,
    });
    expect(syncPlatformProjectToProducts).toHaveBeenCalledWith('pp-1', { source: 'test' });
    expect(result.project.status).toBe(PLATFORM_PROJECT_STATUS.ARCHIVED);
    expect(result.syncResults).toHaveLength(1);
  });

  it('hard-delete archives then deletes plexon row even if sync throws', async () => {
    vi.mocked(getPlatformProjectById).mockResolvedValue(sample(PLATFORM_PROJECT_STATUS.ACTIVE));
    vi.mocked(syncPlatformProjectToProducts).mockRejectedValue(new Error('product down'));
    vi.mocked(deletePlatformProject).mockResolvedValue(undefined);

    const result = await hardDeletePlatformProjectAfterArchive('pp-1');

    expect(updatePlatformProject).toHaveBeenCalledWith('pp-1', {
      status: PLATFORM_PROJECT_STATUS.ARCHIVED,
    });
    expect(deletePlatformProject).toHaveBeenCalledWith('pp-1');
    expect(result.deleted).toBe(true);
  });
});
