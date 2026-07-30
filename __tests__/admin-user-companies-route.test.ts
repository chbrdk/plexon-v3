import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { getCompanyById, listCompanyMembershipsForUser, replaceUserCompanyMemberships } from '@/lib/db/companies';
import { getDb } from '@/lib/db';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/companies', () => ({
  getCompanyById: vi.fn(),
  listCompanyMembershipsForUser: vi.fn(),
  replaceUserCompanyMemberships: vi.fn(),
}));

function mockDbWithUser(id = 'user-1') {
  vi.mocked(getDb).mockReturnValue({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id }],
        }),
      }),
    }),
  } as ReturnType<typeof getDb>);
}

describe('admin user companies route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('rejects GET for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/users/[id]/companies/route');
    const res = await GET(new Request('http://localhost/api/admin/users/u1/companies'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns memberships for admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser('u1');
    vi.mocked(listCompanyMembershipsForUser).mockResolvedValue([
      {
        companyId: 'c1',
        userId: 'u1',
        role: 'member',
        companyName: 'Acme',
        companySlug: 'acme',
      },
    ] as Awaited<ReturnType<typeof listCompanyMembershipsForUser>>);
    const { GET } = await import('@/app/api/admin/users/[id]/companies/route');
    const res = await GET(new Request('http://localhost/api/admin/users/u1/companies'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([
      { companyId: 'c1', companyName: 'Acme', companySlug: 'acme', role: 'member' },
    ]);
  });

  it('PUT validates company exists and calls replace', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser('u1');
    vi.mocked(getCompanyById).mockResolvedValue({
      id: 'c1',
      name: 'Acme',
      slug: 'acme',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(listCompanyMembershipsForUser).mockResolvedValue([
      {
        companyId: 'c1',
        userId: 'u1',
        role: 'owner',
        companyName: 'Acme',
        companySlug: 'acme',
      },
    ] as Awaited<ReturnType<typeof listCompanyMembershipsForUser>>);
    vi.mocked(replaceUserCompanyMemberships).mockResolvedValue(undefined);

    const { PUT } = await import('@/app/api/admin/users/[id]/companies/route');
    const res = await PUT(
      new Request('http://localhost/api/admin/users/u1/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ companyId: 'c1', role: 'owner' }] }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    );
    expect(res.status).toBe(200);
    expect(replaceUserCompanyMemberships).toHaveBeenCalledWith('u1', [{ companyId: 'c1', role: 'owner' }]);
  });

  it('PUT rejects unknown company', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser('u1');
    vi.mocked(getCompanyById).mockResolvedValue(null);

    const { PUT } = await import('@/app/api/admin/users/[id]/companies/route');
    const res = await PUT(
      new Request('http://localhost/api/admin/users/u1/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ companyId: 'missing', role: 'member' }] }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    );
    expect(res.status).toBe(400);
    expect(replaceUserCompanyMemberships).not.toHaveBeenCalled();
  });
});
