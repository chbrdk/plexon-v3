/**
 * Collection members unit tests (mocked DB helpers).
 * Spec: specs/api/collection-members.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-request-user', () => ({
  isAdmin: (user: { role?: string }) => user.role === 'admin',
}));

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/companies', () => ({
  getCompanyIdsForUser: vi.fn(),
}));

vi.mock('@/lib/db/user-platform-project-assignments', () => ({
  getUserPlatformProjectAssignment: vi.fn(),
  listAssignmentsForPlatformProject: vi.fn(),
  upsertUserPlatformProjectAssignment: vi.fn(),
  deleteUserPlatformProjectAssignment: vi.fn(),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
  userCanManageCollectionLifecycle: vi.fn(),
}));

vi.mock('@/lib/mail', () => ({
  sendTransactionalEmail: vi.fn(async () => undefined),
  getPublicAppBaseUrl: () => 'https://plexon.test',
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
  })),
}));

import { getCompanyIdsForUser } from '@/lib/db/companies';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getUserPlatformProjectAssignment,
  listAssignmentsForPlatformProject,
  upsertUserPlatformProjectAssignment,
  deleteUserPlatformProjectAssignment,
} from '@/lib/db/user-platform-project-assignments';
import {
  userCanManageCollectionLifecycle,
  userCanViewPlatformProject,
} from '@/lib/platform-project-access';
import {
  addCollectionMemberByEmail,
  listCollectionMembers,
  revokeCollectionMember,
} from '@/lib/collection-members';
import { sendTransactionalEmail } from '@/lib/mail';

describe('collection members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      companyId: 'co-1',
      createdByUserId: 'creator-1',
      name: 'Demo',
      domain: null,
      metadata: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(userCanViewPlatformProject).mockResolvedValue(true);
    vi.mocked(userCanManageCollectionLifecycle).mockResolvedValue(true);
    vi.mocked(listAssignmentsForPlatformProject).mockResolvedValue([]);
    vi.mocked(getCompanyIdsForUser).mockResolvedValue(['co-1']);
  });

  it('lists creator even when no assignments', async () => {
    const { getDb } = await import('@/lib/db');
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              { id: 'creator-1', email: 'owner@example.com', name: 'Owner' },
            ],
          }),
        }),
      }),
    } as never);

    const result = await listCollectionMembers('pp-1', { id: 'creator-1', role: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([
        {
          userId: 'creator-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'admin',
          source: 'creator',
        },
      ]);
    }
  });

  it('additive POST keeps existing role (no overwrite)', async () => {
    const { getDb } = await import('@/lib/db');
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'u-2', email: 'peer@example.com', name: 'Peer' }],
          }),
        }),
      }),
    } as never);
    vi.mocked(getUserPlatformProjectAssignment).mockResolvedValue({
      userId: 'u-2',
      platformProjectId: 'pp-1',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await addCollectionMemberByEmail({
      platformProjectId: 'pp-1',
      actor: { id: 'creator-1', role: 'user' },
      email: 'peer@example.com',
      role: 'member',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('already_member');
      expect(result.role).toBe('admin');
    }
    expect(upsertUserPlatformProjectAssignment).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('sends collection_member_added mail only when status is added', async () => {
    const { getDb } = await import('@/lib/db');
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'u-new', email: 'new@example.com', name: 'New' }],
          }),
        }),
      }),
    } as never);
    vi.mocked(getUserPlatformProjectAssignment).mockResolvedValue(null);
    vi.mocked(upsertUserPlatformProjectAssignment).mockResolvedValue(undefined as never);

    const result = await addCollectionMemberByEmail({
      platformProjectId: 'pp-1',
      actor: { id: 'creator-1', role: 'user' },
      email: 'new@example.com',
      role: 'member',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.status).toBe('added');
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'collection_member_added',
        to: 'new@example.com',
        payload: expect.objectContaining({
          collectionName: 'Demo',
          role: 'member',
          launchUrl: 'https://plexon.test/projects/pp-1',
        }),
      })
    );
  });

  it('rejects wrong company', async () => {
    const { getDb } = await import('@/lib/db');
    vi.mocked(getDb).mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'u-3', email: 'other@example.com', name: null }],
          }),
        }),
      }),
    } as never);
    vi.mocked(getCompanyIdsForUser).mockResolvedValue(['co-other']);
    vi.mocked(getUserPlatformProjectAssignment).mockResolvedValue(null);

    const result = await addCollectionMemberByEmail({
      platformProjectId: 'pp-1',
      actor: { id: 'creator-1', role: 'user' },
      email: 'other@example.com',
    });
    expect(result).toEqual({ ok: false, status: 403, error: 'wrong_company' });
  });

  it('refuses to revoke the creator', async () => {
    const result = await revokeCollectionMember({
      platformProjectId: 'pp-1',
      userId: 'creator-1',
      actor: { id: 'creator-1', role: 'user' },
    });
    expect(result).toEqual({ ok: false, status: 400, error: 'creator_immutable' });
    expect(deleteUserPlatformProjectAssignment).not.toHaveBeenCalled();
  });
});
