import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdmin } from '@/lib/auth-request-user';
import { checkionFetch } from '@/lib/services/checkion-client';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/services/checkion-client', () => ({
  checkionFetch: vi.fn(),
}));

describe('PLEXON CHECKION admin proxy routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects list access when the caller is not an admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { GET } = await import('@/app/api/services/checkion/users/route');
    const response = await GET(new Request('http://localhost/api/services/checkion/users'));
    expect(response.status).toBe(403);
    expect(checkionFetch).not.toHaveBeenCalled();
  });

  it('proxies list access for admins only', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    vi.mocked(checkionFetch).mockResolvedValue({ ok: true, status: 200, data: { data: [{ id: 'u1' }] } });
    const { GET } = await import('@/app/api/services/checkion/users/route');
    const response = await GET(new Request('http://localhost/api/services/checkion/users'));
    expect(response.status).toBe(200);
    expect(checkionFetch).toHaveBeenCalledWith('/api/admin/users');
  });

  it('rejects detail mutations when the caller is not an admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/services/checkion/users/[id]/route');
    const response = await DELETE(new Request('http://localhost/api/services/checkion/users/u1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'u1' }),
    });
    expect(response.status).toBe(403);
    expect(checkionFetch).not.toHaveBeenCalled();
  });
});
