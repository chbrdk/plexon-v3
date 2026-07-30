import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ensurePlatformProductBindings } from '@/lib/assistant/workflows/ensure-platform-product-bindings';

vi.mock('@/lib/assistant/workflows/create-platform-project', () => ({
  getProjectBindingIds: vi.fn(),
}));

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
  updatePlatformProject: vi.fn(),
}));

vi.mock('@/lib/platform-project-sync-service', () => ({
  syncPlatformProjectToProducts: vi.fn(),
}));

import { getProjectBindingIds } from '@/lib/assistant/workflows/create-platform-project';
import { getPlatformProjectById, updatePlatformProject } from '@/lib/db/platform-projects';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';

describe('ensurePlatformProductBindings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('syncs audion first when binding is missing', async () => {
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      domain: null,
    } as never);
    vi.mocked(getProjectBindingIds)
      .mockResolvedValueOnce({ checkionProjectId: 'c1', audionProjectId: null })
      .mockResolvedValueOnce({ checkionProjectId: 'c1', audionProjectId: 'a1' });
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      { platformProjectId: 'pp-1', productId: 'audion', ok: true, externalProjectId: 'a1' },
    ]);

    const result = await ensurePlatformProductBindings('pp-1', {
      domain: 'udg.de',
      source: 'test',
    });

    expect(updatePlatformProject).toHaveBeenCalledWith('pp-1', { domain: 'udg.de' });
    expect(syncPlatformProjectToProducts).toHaveBeenCalledWith('pp-1', {
      source: 'test',
      onlyProducts: ['audion'],
    });
    expect(result.audionProjectId).toBe('a1');
    expect(result.missingRequired).toEqual([]);
  });

  it('reports missing audion when sync fails', async () => {
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      domain: 'udg.de',
    } as never);
    vi.mocked(getProjectBindingIds).mockResolvedValue({
      checkionProjectId: 'c1',
      audionProjectId: null,
    });
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      { platformProjectId: 'pp-1', productId: 'audion', ok: false, error: 'entitlement missing' },
      { platformProjectId: 'pp-1', productId: 'checkion', ok: true, externalProjectId: 'c1' },
      { platformProjectId: 'pp-1', productId: 'audion', ok: false, error: 'entitlement missing' },
      { platformProjectId: 'pp-1', productId: 'checkion', ok: true, externalProjectId: 'c1' },
    ]);

    const result = await ensurePlatformProductBindings('pp-1', { source: 'test' });

    expect(result.audionProjectId).toBeNull();
    expect(result.missingRequired).toContain('audion');
  });
});
