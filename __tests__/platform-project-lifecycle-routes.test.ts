import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
  requireAdmin: vi.fn(),
  isAdmin: vi.fn(),
}));
vi.mock('@/lib/auth-company-access', () => ({
  canManageCompany: vi.fn(),
}));
vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
  updatePlatformProject: vi.fn(),
}));
vi.mock('@/lib/db/platform-project-bindings', () => ({
  getBindingsForPlatformProject: vi.fn(),
}));
vi.mock('@/lib/platform-project-lifecycle', () => ({
  setPlatformProjectLifecycleStatus: vi.fn(),
  hardDeletePlatformProjectAfterArchive: vi.fn(),
}));

import { getRequestUser, requireAdmin } from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import {
  hardDeletePlatformProjectAfterArchive,
  setPlatformProjectLifecycleStatus,
} from '@/lib/platform-project-lifecycle';
import { PATCH as companyPatch } from '@/app/api/platform/projects/[platformProjectId]/route';
import { DELETE as adminDelete } from '@/app/api/admin/platform-projects/[id]/route';
import { PLATFORM_PROJECT_STATUS } from '@/lib/platform-companies';

const now = new Date();
const project = {
  id: 'pp-1',
  companyId: 'c1',
  name: 'Demo',
  domain: null,
  metadata: null,
  status: PLATFORM_PROJECT_STATUS.ACTIVE,
  createdByUserId: 'u1',
  createdAt: now,
  updatedAt: now,
};

describe('collection lifecycle routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('company PATCH archives via lifecycle helper', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      role: 'user',
      name: null,
    } as never);
    vi.mocked(getPlatformProjectById).mockResolvedValue(project as never);
    vi.mocked(canManageCompany).mockResolvedValue(true);
    vi.mocked(setPlatformProjectLifecycleStatus).mockResolvedValue({
      project: { ...project, status: PLATFORM_PROJECT_STATUS.ARCHIVED },
      syncResults: [],
    } as never);
    vi.mocked(getBindingsForPlatformProject).mockResolvedValue([]);

    const res = await companyPatch(
      new Request('http://localhost/api/platform/projects/pp-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );

    expect(res.status).toBe(200);
    expect(setPlatformProjectLifecycleStatus).toHaveBeenCalledWith(
      'pp-1',
      PLATFORM_PROJECT_STATUS.ARCHIVED,
      expect.objectContaining({ source: 'plexon-company-lifecycle' })
    );
  });

  it('admin DELETE requires global admin and archive-then-delete', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin',
      email: 'admin@x',
      role: 'admin',
      name: null,
    } as never);
    vi.mocked(getPlatformProjectById).mockResolvedValue(project as never);
    vi.mocked(hardDeletePlatformProjectAfterArchive).mockResolvedValue({
      syncResults: [],
      deleted: true,
    });

    const res = await adminDelete(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'pp-1' }),
    });

    expect(res.status).toBe(204);
    expect(hardDeletePlatformProjectAfterArchive).toHaveBeenCalledWith('pp-1', {
      source: 'plexon-admin-hard-delete',
    });
  });

  it('admin DELETE forbids non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const res = await adminDelete(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'pp-1' }),
    });
    expect(res.status).toBe(403);
    expect(hardDeletePlatformProjectAfterArchive).not.toHaveBeenCalled();
  });
});
