import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { listAllCompanyMembershipsWithDetails } from '@/lib/db/companies';
import { getDb } from '@/lib/db';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/companies', () => ({
  listAllCompanyMembershipsWithDetails: vi.fn(),
}));

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/users/route');
    const res = await GET(new Request('http://localhost/api/admin/users'));
    expect(res.status).toBe(403);
  });

  it('includes organizations per user', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    const created = new Date('2026-01-01T00:00:00.000Z');
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          orderBy: () =>
            Promise.resolve([
              {
                id: 'u1',
                email: 'a@example.com',
                name: 'Alice',
                company: null,
                locale: 'de',
                role: 'user',
                createdAt: created,
              },
            ]),
        }),
      }),
    } as ReturnType<typeof getDb>);
    vi.mocked(listAllCompanyMembershipsWithDetails).mockResolvedValue([
      {
        userId: 'u1',
        companyId: 'c1',
        role: 'member',
        companyName: 'Acme',
        companySlug: 'acme',
      },
    ] as Awaited<ReturnType<typeof listAllCompanyMembershipsWithDetails>>);

    const { GET } = await import('@/app/api/admin/users/route');
    const res = await GET(new Request('http://localhost/api/admin/users'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].organizations).toEqual([
      {
        companyId: 'c1',
        companyName: 'Acme',
        companySlug: 'acme',
        role: 'member',
      },
    ]);
  });
});
