import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));
vi.mock('@/lib/db/user-platform-project-assignments', () => ({
  getUserPlatformProjectAssignment: vi.fn(),
}));
vi.mock('@/lib/db/product-project-assignments', () => ({
  listUserProductProjectAssignments: vi.fn(),
}));
vi.mock('@/lib/db/platform-project-bindings', () => ({
  findPlatformProjectIdByProductExternal: vi.fn(),
}));

import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';

describe('userCanViewPlatformProject', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      companyId: 'c99',
      name: 'X',
      domain: null,
      metadata: null,
      status: 'active',
      createdByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);
    vi.mocked(getUserPlatformProjectAssignment).mockResolvedValue(null);
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([]);
  });

  it('allows member user when legacy product assignment binds to this platform project', async () => {
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([
      {
        userId: 'u1',
        productId: 'checkion',
        projectId: 'chk-1',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(findPlatformProjectIdByProductExternal).mockResolvedValue('pp-1');

    const { userCanViewPlatformProject } = await import('@/lib/platform-project-access');
    const ok = await userCanViewPlatformProject('u1', 'user', 'pp-1');
    expect(ok).toBe(true);
  });

  it('allows creator without assignment row', async () => {
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      companyId: 'c99',
      name: 'X',
      domain: null,
      metadata: null,
      status: 'active',
      createdByUserId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);

    const { userCanViewPlatformProject } = await import('@/lib/platform-project-access');
    const ok = await userCanViewPlatformProject('u1', 'user', 'pp-1');
    expect(ok).toBe(true);
  });

  it('denies company member who is neither creator nor assigned', async () => {
    const { userCanViewPlatformProject } = await import('@/lib/platform-project-access');
    const ok = await userCanViewPlatformProject('u1', 'user', 'pp-1');
    expect(ok).toBe(false);
  });

  it('allows direct assignment', async () => {
    vi.mocked(getUserPlatformProjectAssignment).mockResolvedValue({
      userId: 'u1',
      platformProjectId: 'pp-1',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { userCanViewPlatformProject } = await import('@/lib/platform-project-access');
    const ok = await userCanViewPlatformProject('u1', 'user', 'pp-1');
    expect(ok).toBe(true);
  });
});
