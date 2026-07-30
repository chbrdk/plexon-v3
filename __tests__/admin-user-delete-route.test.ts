import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { deprovisionUserAcrossProducts } from '@/lib/platform-provisioning-service';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/platform-provisioning-service', () => ({
  deprovisionUserAcrossProducts: vi.fn(),
  syncUserProductProvisioning: vi.fn(),
}));

function mockDbForDelete(existingId: string | null, rowCount = 1) {
  const deleteWhere = vi.fn().mockResolvedValue({ rowCount });
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere });
  const selectLimit = vi.fn().mockResolvedValue(existingId ? [{ id: existingId }] : []);
  const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
  const selectFn = vi.fn().mockReturnValue({ from: selectFrom });

  vi.mocked(getDb).mockReturnValue({
    select: selectFn,
    delete: deleteFn,
  } as unknown as ReturnType<typeof getDb>);

  return { deleteWhere, deleteFn };
}

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/admin/users/[id]/route');
    const res = await DELETE(new Request('http://localhost/api/admin/users/u1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'u1' }),
    });
    expect(res.status).toBe(403);
    expect(deprovisionUserAcrossProducts).not.toHaveBeenCalled();
  });

  it('rejects deleting your own account', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    const { DELETE } = await import('@/app/api/admin/users/[id]/route');
    const res = await DELETE(new Request('http://localhost/api/admin/users/admin-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'admin-1' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own account/i);
    expect(deprovisionUserAcrossProducts).not.toHaveBeenCalled();
  });

  it('returns 404 when user does not exist', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbForDelete(null);
    const { DELETE } = await import('@/app/api/admin/users/[id]/route');
    const res = await DELETE(new Request('http://localhost/api/admin/users/missing', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
    expect(deprovisionUserAcrossProducts).not.toHaveBeenCalled();
  });

  it('deprovisions and deletes an existing user', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    const { deleteWhere } = mockDbForDelete('u1');
    const { DELETE } = await import('@/app/api/admin/users/[id]/route');
    const res = await DELETE(new Request('http://localhost/api/admin/users/u1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'u1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(deprovisionUserAcrossProducts).toHaveBeenCalledWith('u1');
    expect(deleteWhere).toHaveBeenCalled();
  });
});
