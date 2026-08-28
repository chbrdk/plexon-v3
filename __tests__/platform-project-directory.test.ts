import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/platform-projects', () => ({
  listPlatformProjectsCreatedByUser: vi.fn(),
  getPlatformProjectById: vi.fn(),
}));
vi.mock('@/lib/db/user-platform-project-assignments', () => ({
  listUserPlatformProjectAssignments: vi.fn(),
}));
vi.mock('@/lib/db/product-project-assignments', () => ({
  listUserProductProjectAssignments: vi.fn(),
}));
vi.mock('@/lib/db/platform-project-bindings', () => ({
  findPlatformProjectIdByProductExternal: vi.fn(),
}));

import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import {
  getPlatformProjectById,
  listPlatformProjectsCreatedByUser,
} from '@/lib/db/platform-projects';
import { listUserPlatformProjectAssignments } from '@/lib/db/user-platform-project-assignments';

const sampleProject = (id: string, createdByUserId = 'u0') => {
  const now = new Date();
  return {
    id,
    companyId: 'c1',
    name: 'Proj',
    domain: null,
    metadata: null,
    status: 'active' as const,
    createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
};

describe('listAccessiblePlatformProjectsForUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listPlatformProjectsCreatedByUser).mockResolvedValue([]);
    vi.mocked(listUserPlatformProjectAssignments).mockResolvedValue([]);
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([]);
  });

  it('includes collections the user created', async () => {
    vi.mocked(listPlatformProjectsCreatedByUser).mockResolvedValue([sampleProject('pp-created', 'u1')]);

    const { listAccessiblePlatformProjectsForUser } = await import('@/lib/platform-project-directory');
    const rows = await listAccessiblePlatformProjectsForUser('u1');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('pp-created');
    expect(listPlatformProjectsCreatedByUser).toHaveBeenCalledWith('u1', { includeArchived: false });
  });

  it('merges legacy entitlement product assignments when bindings resolve to a platform project', async () => {
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([
      {
        userId: 'u1',
        productId: 'checkion',
        projectId: 'chk-99',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(findPlatformProjectIdByProductExternal).mockResolvedValue('pp-1');
    vi.mocked(getPlatformProjectById).mockResolvedValue(sampleProject('pp-1'));

    const { listAccessiblePlatformProjectsForUser } = await import('@/lib/platform-project-directory');
    const rows = await listAccessiblePlatformProjectsForUser('u1');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('pp-1');
    expect(findPlatformProjectIdByProductExternal).toHaveBeenCalledWith('checkion', 'chk-99');
  });

  it('dedupes when creator and legacy resolve to same platform', async () => {
    vi.mocked(listPlatformProjectsCreatedByUser).mockResolvedValue([sampleProject('pp-1', 'u1')]);
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([
      {
        userId: 'u1',
        productId: 'audion',
        projectId: 'aud-1',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(findPlatformProjectIdByProductExternal).mockResolvedValue('pp-1');

    const { listAccessiblePlatformProjectsForUser } = await import('@/lib/platform-project-directory');
    const rows = await listAccessiblePlatformProjectsForUser('u1');
    expect(rows).toHaveLength(1);
  });

  it('does not grant access via company membership alone', async () => {
    vi.mocked(listUserPlatformProjectAssignments).mockResolvedValue([]);
    vi.mocked(listPlatformProjectsCreatedByUser).mockResolvedValue([]);

    const { listAccessiblePlatformProjectsForUser } = await import('@/lib/platform-project-directory');
    const rows = await listAccessiblePlatformProjectsForUser('u1');
    expect(rows).toHaveLength(0);
  });

  it('passes includeArchived to creator list helper', async () => {
    vi.mocked(listPlatformProjectsCreatedByUser).mockResolvedValue([sampleProject('pp-arch', 'u1')]);

    const { listAccessiblePlatformProjectsForUser } = await import('@/lib/platform-project-directory');
    await listAccessiblePlatformProjectsForUser('u1', { includeArchived: true });
    expect(listPlatformProjectsCreatedByUser).toHaveBeenCalledWith('u1', {
      includeArchived: true,
    });
  });

  it('includes explicit assignment when not creator', async () => {
    vi.mocked(listUserPlatformProjectAssignments).mockResolvedValue([
      {
        userId: 'u1',
        platformProjectId: 'pp-assigned',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(getPlatformProjectById).mockResolvedValue(sampleProject('pp-assigned', 'other'));

    const { listAccessiblePlatformProjectsForUser } = await import('@/lib/platform-project-directory');
    const rows = await listAccessiblePlatformProjectsForUser('u1');
    expect(rows.map((r) => r.id)).toEqual(['pp-assigned']);
  });
});
