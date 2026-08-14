import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/platform-project-directory', () => ({
  listAccessiblePlatformProjectsForUser: vi.fn(),
}));

describe('listAccessibleCollectionsForUser', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('maps accessible Collections and reports truncation', async () => {
    const directory = await import('@/lib/platform-project-directory');
    vi.mocked(directory.listAccessiblePlatformProjectsForUser).mockResolvedValue([
      {
        id: 'pp-1',
        name: 'Alpha',
        status: 'active',
        companyId: 'co-1',
        domain: 'alpha.test',
      },
      {
        id: 'pp-2',
        name: 'Beta',
        status: 'active',
        companyId: 'co-1',
        domain: null,
      },
    ] as never);

    const { listAccessibleCollectionsForUser } = await import('@/lib/list-accessible-collections');
    const result = await listAccessibleCollectionsForUser('user-1');

    expect(result.totalAccessible).toBe(2);
    expect(result.truncated).toBe(false);
    expect(result.items).toEqual([
      {
        id: 'pp-1',
        name: 'Alpha',
        status: 'active',
        companyId: 'co-1',
        domain: 'alpha.test',
      },
      {
        id: 'pp-2',
        name: 'Beta',
        status: 'active',
        companyId: 'co-1',
        domain: null,
      },
    ]);
    expect(directory.listAccessiblePlatformProjectsForUser).toHaveBeenCalledWith('user-1');
  });

  it('uses the same cap as Sync', async () => {
    const directory = await import('@/lib/platform-project-directory');
    const { SYNC_ACCESSIBLE_MIRRORS_CAP } = await import('@/lib/sync-accessible-capability-mirrors');
    const rows = Array.from({ length: SYNC_ACCESSIBLE_MIRRORS_CAP + 3 }, (_, i) => ({
      id: `pp-${i}`,
      name: `C${i}`,
      status: 'active',
      companyId: 'co-1',
      domain: null,
    }));
    vi.mocked(directory.listAccessiblePlatformProjectsForUser).mockResolvedValue(rows as never);

    const { listAccessibleCollectionsForUser } = await import('@/lib/list-accessible-collections');
    const result = await listAccessibleCollectionsForUser('user-1');
    expect(result.truncated).toBe(true);
    expect(result.totalAccessible).toBe(SYNC_ACCESSIBLE_MIRRORS_CAP + 3);
    expect(result.items).toHaveLength(SYNC_ACCESSIBLE_MIRRORS_CAP);
  });
});
