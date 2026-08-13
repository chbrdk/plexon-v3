import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/platform-project-directory', () => ({
  listAccessiblePlatformProjectsForUser: vi.fn(),
}));

vi.mock('@/lib/platform-project-sync-service', () => ({
  syncPlatformProjectToProducts: vi.fn(),
}));

describe('syncAccessibleCapabilityMirrors', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('syncs creation-only for each accessible Collection', async () => {
    const directory = await import('@/lib/platform-project-directory');
    const sync = await import('@/lib/platform-project-sync-service');
    vi.mocked(directory.listAccessiblePlatformProjectsForUser).mockResolvedValue([
      { id: 'pp-1', name: 'A' },
      { id: 'pp-2', name: 'B' },
    ] as never);
    vi.mocked(sync.syncPlatformProjectToProducts).mockImplementation(async (id) => [
      { platformProjectId: id, productId: 'creation', ok: true, externalProjectId: `ext-${id}` },
    ]);

    const { syncAccessibleCapabilityMirrors } = await import(
      '@/lib/sync-accessible-capability-mirrors'
    );
    const result = await syncAccessibleCapabilityMirrors('user-1', {
      productIds: ['creation'],
    });

    expect(result.synced).toBe(2);
    expect(result.productIds).toEqual(['creation']);
    expect(sync.syncPlatformProjectToProducts).toHaveBeenCalledTimes(2);
    expect(sync.syncPlatformProjectToProducts).toHaveBeenCalledWith('pp-1', {
      source: 'plexon-sync-accessible-mirrors',
      onlyProducts: ['creation'],
    });
    expect(result.results.every((r) => r.ok)).toBe(true);
  });

  it('defaults to all Phase-1 mirror products when productIds omitted', async () => {
    const directory = await import('@/lib/platform-project-directory');
    const sync = await import('@/lib/platform-project-sync-service');
    vi.mocked(directory.listAccessiblePlatformProjectsForUser).mockResolvedValue([]);
    vi.mocked(sync.syncPlatformProjectToProducts).mockResolvedValue([]);

    const { syncAccessibleCapabilityMirrors } = await import(
      '@/lib/sync-accessible-capability-mirrors'
    );
    const result = await syncAccessibleCapabilityMirrors('user-1');
    expect(result.productIds).toEqual(['checkion', 'audion', 'brandion', 'creation']);
    expect(result.synced).toBe(0);
  });
});
