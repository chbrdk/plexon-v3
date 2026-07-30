import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { bulkReplaceCompanyFields } from '@/lib/db/companies';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db/companies', () => ({
  bulkReplaceCompanyFields: vi.fn(),
}));

describe('POST /api/admin/companies/bulk', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/companies/bulk/route');
    const res = await POST(
      new Request('http://localhost/api/admin/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'c1', name: 'A', slug: null }] }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('calls bulkReplaceCompanyFields for admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    vi.mocked(bulkReplaceCompanyFields).mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/admin/companies/bulk/route');
    const res = await POST(
      new Request('http://localhost/api/admin/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: 'c1', name: 'One', slug: 'one' },
            { id: 'c2', name: 'Two', slug: null },
          ],
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.updated).toBe(2);
    expect(bulkReplaceCompanyFields).toHaveBeenCalledWith([
      { id: 'c1', name: 'One', slug: 'one' },
      { id: 'c2', name: 'Two', slug: null },
    ]);
  });

  it('returns 404 when companies missing', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    vi.mocked(bulkReplaceCompanyFields).mockRejectedValue(new Error('One or more companies not found'));
    const { POST } = await import('@/app/api/admin/companies/bulk/route');
    const res = await POST(
      new Request('http://localhost/api/admin/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'missing', name: 'X', slug: null }] }),
      })
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 on slug conflict message', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    vi.mocked(bulkReplaceCompanyFields).mockRejectedValue(new Error('slug already in use: taken'));
    const { POST } = await import('@/app/api/admin/companies/bulk/route');
    const res = await POST(
      new Request('http://localhost/api/admin/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'c1', name: 'A', slug: 'taken' }] }),
      })
    );
    expect(res.status).toBe(400);
  });
});
