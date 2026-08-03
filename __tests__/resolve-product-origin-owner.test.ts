import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCompanyUser,
  createCompany,
  getCompanyById,
  getCompanyIdsForUser,
  listAllCompanyMembershipsWithDetails,
  listCompanies,
  listCompanyUsers,
} from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import {
  FEDERATION_BOOTSTRAP,
  resolveProductOriginOwner,
} from '@/lib/resolve-product-origin-owner';

vi.mock('@/lib/db/companies', () => ({
  addCompanyUser: vi.fn(),
  createCompany: vi.fn(),
  getCompanyById: vi.fn(),
  getCompanyIdsForUser: vi.fn(),
  listAllCompanyMembershipsWithDetails: vi.fn(),
  listCompanies: vi.fn(),
  listCompanyUsers: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed') },
}));

function mockSelectUsers(rows: Array<{ id: string }>) {
  vi.mocked(getDb).mockReturnValue({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
        orderBy: () => ({
          limit: async () => rows,
        }),
      }),
    }),
    insert: () => ({
      values: async () => undefined,
    }),
  } as ReturnType<typeof getDb>);
}

describe('resolveProductOriginOwner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSelectUsers([{ id: 'owner-1' }]);
    vi.mocked(getCompanyIdsForUser).mockResolvedValue(['comp-a']);
    vi.mocked(listAllCompanyMembershipsWithDetails).mockResolvedValue([]);
    vi.mocked(listCompanies).mockResolvedValue([]);
    vi.mocked(listCompanyUsers).mockResolvedValue([]);
    vi.mocked(getCompanyById).mockResolvedValue(null);
    vi.mocked(addCompanyUser).mockResolvedValue(undefined);
    vi.mocked(createCompany).mockResolvedValue(undefined);
  });

  it('uses explicit owner + company when membership is valid', async () => {
    const result = await resolveProductOriginOwner({
      ownerPlexonUserId: 'owner-1',
      platformCompanyId: 'comp-a',
    });
    expect(result).toEqual({
      ownerPlexonUserId: 'owner-1',
      platformCompanyId: 'comp-a',
      source: 'explicit',
    });
  });

  it('picks existing membership when both omitted', async () => {
    mockSelectUsers([]);
    vi.mocked(listAllCompanyMembershipsWithDetails).mockResolvedValue([
      {
        userId: 'u2',
        companyId: 'c2',
        role: 'member',
        companyName: 'Acme',
        companySlug: 'acme',
      },
      {
        userId: 'u1',
        companyId: 'c1',
        role: 'owner',
        companyName: 'Root',
        companySlug: 'root',
      },
    ]);
    const result = await resolveProductOriginOwner({});
    expect(result).toEqual({
      ownerPlexonUserId: 'u1',
      platformCompanyId: 'c1',
      source: 'existing_membership',
    });
  });

  it('bootstraps federation user + company when island is empty', async () => {
    mockSelectUsers([]);
    vi.mocked(listAllCompanyMembershipsWithDetails).mockResolvedValue([]);
    vi.mocked(listCompanies).mockResolvedValue([]);
    vi.mocked(getCompanyById).mockResolvedValue(null);

    const result = await resolveProductOriginOwner({});
    expect(result.source).toBe('bootstrap_user_and_company');
    expect(result.ownerPlexonUserId).toBe(FEDERATION_BOOTSTRAP.userId);
    expect(result.platformCompanyId).toBe(FEDERATION_BOOTSTRAP.companyId);
    expect(createCompany).toHaveBeenCalled();
    expect(addCompanyUser).toHaveBeenCalled();
  });
});
