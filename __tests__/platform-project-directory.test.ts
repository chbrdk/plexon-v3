import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/companies', () => ({
  getCompanyIdsForUser: vi.fn(),
}));
vi.mock('@/lib/db/platform-projects', () => ({
  listPlatformProjectsForCompanies: vi.fn(),
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

import { getCompanyIdsForUser } from '@/lib/db/companies';
import { findPlatformProjectIdByProductExternal } from '@/lib/db/platform-project-bindings';
import { listUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import { getPlatformProjectById, listPlatformProjectsForCompanies } from '@/lib/db/platform-projects';
import { listUserPlatformProjectAssignments } from '@/lib/db/user-platform-project-assignments';

const sampleProject = (id: string) => {
  const now = new Date();
  return {
    id,
    companyId: 'c1',
    name: 'Proj',
    domain: null,
    metadata: null,
    status: 'active' as const,
    createdByUserId: 'u0',
    createdAt: now,
    updatedAt: now,
  };
};

describe('listAccessiblePlatformProjectsForUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCompanyIdsForUser).mockResolvedValue([]);
    vi.mocked(listPlatformProjectsForCompanies).mockResolvedValue([]);
    vi.mocked(listUserPlatformProjectAssignments).mockResolvedValue([]);
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([]);
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

  it('dedupes when company list and legacy resolve to same platform', async () => {
    vi.mocked(getCompanyIdsForUser).mockResolvedValue(['c1']);
    vi.mocked(listPlatformProjectsForCompanies).mockResolvedValue([sampleProject('pp-1')]);
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
});
