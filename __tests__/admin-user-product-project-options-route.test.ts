import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { listAdminProductProjectPickerItems } from '@/lib/admin-product-project-options';
import { getDb } from '@/lib/db';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/admin-product-project-options', () => ({
  listAdminProductProjectPickerItems: vi.fn(),
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

describe('GET /api/admin/users/[id]/product-project-options', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/users/[id]/product-project-options/route');
    const res = await GET(
      new Request('http://localhost/api/admin/users/u1/product-project-options?productId=checkion'),
      { params: Promise.resolve({ id: 'u1' }) }
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when productId is missing or invalid', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    const { GET } = await import('@/app/api/admin/users/[id]/product-project-options/route');
    const res = await GET(new Request('http://localhost/api/admin/users/u1/product-project-options'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns picker items for checkion', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser('u1');
    vi.mocked(listAdminProductProjectPickerItems).mockResolvedValue([
      {
        projectId: 'ext-1',
        platformProjectId: 'pp-1',
        platformProjectName: 'Acme',
        platformProjectDomain: 'acme.test',
      },
    ]);
    const { GET } = await import('@/app/api/admin/users/[id]/product-project-options/route');
    const res = await GET(
      new Request('http://localhost/api/admin/users/u1/product-project-options?productId=checkion'),
      { params: Promise.resolve({ id: 'u1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.productId).toBe('checkion');
    expect(body.items).toHaveLength(1);
    expect(body.items[0].projectId).toBe('ext-1');
  });
});
