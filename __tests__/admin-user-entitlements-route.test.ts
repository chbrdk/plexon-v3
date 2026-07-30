import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { replaceUserProductEntitlements } from '@/lib/db/product-entitlements';
import { replaceUserProductProjectAssignments } from '@/lib/db/product-project-assignments';
import {
  listUserPlatformProjectAssignments,
  replaceUserPlatformProjectAssignments,
} from '@/lib/db/user-platform-project-assignments';
import { getManagedPlatformProductsForUser } from '@/lib/platform-product-registry';
import { syncUserProductProvisioning } from '@/lib/platform-provisioning-service';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/product-entitlements', () => ({
  replaceUserProductEntitlements: vi.fn(),
}));

vi.mock('@/lib/db/product-project-assignments', () => ({
  replaceUserProductProjectAssignments: vi.fn(),
}));

vi.mock('@/lib/db/user-platform-project-assignments', () => ({
  listUserPlatformProjectAssignments: vi.fn(),
  replaceUserPlatformProjectAssignments: vi.fn(),
}));

vi.mock('@/lib/platform-product-registry', () => ({
  getManagedPlatformProductsForUser: vi.fn(),
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

describe('admin user entitlements route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.mocked(listUserPlatformProjectAssignments).mockResolvedValue([]);
  });

  it('rejects entitlement access for non-admin callers', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/users/[id]/entitlements/route');
    const response = await GET(new Request('http://localhost/api/admin/users/user-1/entitlements'), {
      params: Promise.resolve({ id: 'user-1' }),
    });
    expect(response.status).toBe(403);
  });

  it('returns editable entitlement data for admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    vi.mocked(getManagedPlatformProductsForUser).mockResolvedValue([
      {
        productId: 'checkion',
        name: 'CHECKION',
        lifecycle: 'active',
        surface: 'federated',
        entryPoints: [{ id: 'checkion-home', labelKey: 'dashboard.entry.home', href: 'https://checkion.example.com/', openInNewTab: true }],
        defaultAccess: 'granted',
        entitlement: null,
        projectAssignments: [],
        platformProjectAssignments: [],
        provisioning: null,
        viewerRole: 'admin',
      },
    ]);

    const { GET } = await import('@/app/api/admin/users/[id]/entitlements/route');
    const response = await GET(new Request('http://localhost/api/admin/users/user-1/entitlements'), {
      params: Promise.resolve({ id: 'user-1' }),
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.items[0]).toMatchObject({
      productId: 'checkion',
      status: 'active',
      platformRole: 'member',
    });
  });

  it('validates and persists entitlement updates', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    vi.mocked(replaceUserProductEntitlements).mockResolvedValue([
      {
        userId: 'user-1',
        productId: 'checkion',
        status: 'active',
        platformRole: 'manager',
        defaultContext: { entryPointId: 'checkion-projects', projectId: 'project-1' },
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);
    vi.mocked(replaceUserProductProjectAssignments).mockResolvedValue([]);
    vi.mocked(syncUserProductProvisioning).mockResolvedValue([
      {
        userId: 'user-1',
        productId: 'checkion',
        desiredState: 'granted',
        syncStatus: 'in_sync',
        syncMessage: null,
        lastAttemptAt: new Date('2026-05-12T10:00:00.000Z'),
        lastSucceededAt: new Date('2026-05-12T10:00:00.000Z'),
        lastSourceHash: 'hash-1',
        externalUserRef: 'user-1',
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);

    const { PUT } = await import('@/app/api/admin/users/[id]/entitlements/route');
    const response = await PUT(
      new Request('http://localhost/api/admin/users/user-1/entitlements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              productId: 'checkion',
              status: 'active',
              platformRole: 'manager',
              defaultContext: {
                entryPointId: 'checkion-projects',
                projectId: 'project-1',
              },
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ id: 'user-1' }),
      }
    );

    expect(response.status).toBe(200);
    expect(replaceUserProductEntitlements).toHaveBeenCalledWith('user-1', [
      {
        productId: 'checkion',
        status: 'active',
        platformRole: 'manager',
        defaultContext: { entryPointId: 'checkion-projects', projectId: 'project-1' },
      },
    ]);
    expect(replaceUserProductProjectAssignments).toHaveBeenCalledWith('user-1', []);
    expect(syncUserProductProvisioning).toHaveBeenCalledWith('user-1', {
      force: true,
      source: 'plexon-admin-entitlements',
    });
  });

  it('persists explicit audion project assignments', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    vi.mocked(replaceUserProductEntitlements).mockResolvedValue([
      {
        userId: 'user-1',
        productId: 'audion',
        status: 'active',
        platformRole: 'manager',
        defaultContext: null,
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);
    vi.mocked(replaceUserProductProjectAssignments).mockResolvedValue([
      {
        userId: 'user-1',
        productId: 'audion',
        projectId: '8d9ec6ff-8ac2-47e5-88af-2de6ee149d9d',
        role: 'admin',
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);
    vi.mocked(syncUserProductProvisioning).mockResolvedValue([]);

    const { PUT } = await import('@/app/api/admin/users/[id]/entitlements/route');
    const response = await PUT(
      new Request('http://localhost/api/admin/users/user-1/entitlements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              productId: 'audion',
              status: 'active',
              platformRole: 'manager',
              defaultContext: null,
              projectAssignments: [
                {
                  projectId: '8d9ec6ff-8ac2-47e5-88af-2de6ee149d9d',
                  role: 'admin',
                },
              ],
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ id: 'user-1' }),
      }
    );

    expect(response.status).toBe(200);
    expect(replaceUserProductProjectAssignments).toHaveBeenCalledWith('user-1', [
      {
        productId: 'audion',
        projectId: '8d9ec6ff-8ac2-47e5-88af-2de6ee149d9d',
        role: 'admin',
      },
    ]);
    expect(replaceUserPlatformProjectAssignments).not.toHaveBeenCalled();
  });

  it('persists platform project assignments when provided', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockDbWithUser();
    vi.mocked(replaceUserProductEntitlements).mockResolvedValue([
      {
        userId: 'user-1',
        productId: 'checkion',
        status: 'active',
        platformRole: 'member',
        defaultContext: null,
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);
    vi.mocked(replaceUserProductProjectAssignments).mockResolvedValue([]);
    vi.mocked(replaceUserPlatformProjectAssignments).mockResolvedValue([
      {
        userId: 'user-1',
        platformProjectId: 'pp-1',
        role: 'member',
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        updatedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);
    vi.mocked(syncUserProductProvisioning).mockResolvedValue([]);

    const { PUT } = await import('@/app/api/admin/users/[id]/entitlements/route');
    const response = await PUT(
      new Request('http://localhost/api/admin/users/user-1/entitlements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformProjectAssignments: [{ platformProjectId: 'pp-1', role: 'member' }],
          items: [
            {
              productId: 'checkion',
              status: 'active',
              platformRole: 'member',
              defaultContext: null,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );

    expect(response.status).toBe(200);
    expect(replaceUserPlatformProjectAssignments).toHaveBeenCalledWith('user-1', [
      { platformProjectId: 'pp-1', role: 'member' },
    ]);
  });
});
