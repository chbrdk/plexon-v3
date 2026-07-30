import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { getCompanyById, updateCompany } from '@/lib/db/companies';
import { getDb } from '@/lib/db';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db/companies', () => ({
  getCompanyById: vi.fn(),
  updateCompany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

describe('PATCH /api/admin/companies/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/admin/companies/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/api/admin/companies/c1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      }),
      { params: Promise.resolve({ id: 'c1' }) }
    );
    expect(res.status).toBe(403);
  });

  it('updates company when admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    vi.mocked(getCompanyById)
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'Old',
        slug: 'old',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'c1',
        name: 'New',
        slug: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    } as ReturnType<typeof getDb>);
    vi.mocked(updateCompany).mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/admin/companies/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/api/admin/companies/c1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', slug: 'new' }),
      }),
      { params: Promise.resolve({ id: 'c1' }) }
    );
    expect(res.status).toBe(200);
    expect(updateCompany).toHaveBeenCalledWith('c1', { name: 'New', slug: 'new' });
  });
});
