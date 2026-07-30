import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { syncUserProductProvisioning } from '@/lib/platform-provisioning-service';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/platform-provisioning-service', () => ({
  syncUserProductProvisioning: vi.fn(),
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

describe('admin user provisioning route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('rejects provisioning actions for non-admin callers', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/users/[id]/provisioning/route');
    const response = await POST(new Request('http://localhost/api/admin/users/user-1/provisioning'), {
      params: Promise.resolve({ id: 'user-1' }),
    });
    expect(response.status).toBe(403);
  });

  it('validates provisioning action payloads', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    const { POST } = await import('@/app/api/admin/users/[id]/provisioning/route');
    const response = await POST(
      new Request('http://localhost/api/admin/users/user-1/provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'retry', productIds: ['invalid-product'] }),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );
    expect(response.status).toBe(400);
  });

  it('forces provisioning retry for selected products', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    vi.mocked(syncUserProductProvisioning).mockResolvedValue([
      {
        userId: 'user-1',
        productId: 'checkion',
        desiredState: 'granted',
        syncStatus: 'in_sync',
        syncMessage: 'Recovered',
        lastAttemptAt: new Date('2026-05-12T10:00:00.000Z'),
        lastSucceededAt: new Date('2026-05-12T10:00:00.000Z'),
        lastSourceHash: 'hash-1',
        externalUserRef: 'checkion-user-1',
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);

    const { POST } = await import('@/app/api/admin/users/[id]/provisioning/route');
    const response = await POST(
      new Request('http://localhost/api/admin/users/user-1/provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'retry', productIds: ['checkion'] }),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(syncUserProductProvisioning).toHaveBeenCalledWith('user-1', {
      force: true,
      productIds: ['checkion'],
      source: 'plexon-admin-retry',
    });
    expect(data.items[0]).toMatchObject({
      productId: 'checkion',
      syncStatus: 'in_sync',
      externalUserRef: 'checkion-user-1',
    });
  });
});
