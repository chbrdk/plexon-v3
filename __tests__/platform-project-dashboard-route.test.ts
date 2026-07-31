import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestUser } from '@/lib/auth-request-user';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/platform-project-bindings', () => ({
  getBindingsForPlatformProject: vi.fn(),
}));

vi.mock('@/lib/platform-project-dashboard-fetch', () => ({
  fetchCheckionPlatformProjectSummary: vi.fn(),
  fetchAudionPlatformProjectSummary: vi.fn(),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
}));

describe('GET /api/platform/projects/[platformProjectId]/dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const { GET } = await import('@/app/api/platform/projects/[platformProjectId]/dashboard/route');
    const res = await GET(new Request('http://localhost/api/platform/projects/p1/dashboard'), {
      params: Promise.resolve({ platformProjectId: 'p1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns aggregated payload for allowed users', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1', role: 'user' });
    vi.mocked(userCanViewPlatformProject).mockResolvedValue(true);
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'p1',
      companyId: 'c1',
      name: 'Acme',
      domain: 'acme.test',
      metadata: null,
      status: 'active',
      createdByUserId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);
    vi.mocked(getBindingsForPlatformProject).mockResolvedValue([
      {
        platformProjectId: 'p1',
        productId: 'checkion',
        externalProjectId: 'chk-1',
        syncStatus: 'in_sync',
        syncMessage: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(fetchCheckionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'chk-1',
      scanCount: 3,
    });
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'aud-1',
      personaCount: 2,
      targetGroupCount: 1,
      targetGroups: [
        { id: 'tg-1', name: 'Buyers', segment: 'B2B', personaCount: 2, status: 'active' },
      ],
      personas: [
        { id: 'p-1', name: 'Alex', role: 'Buyer', status: 'ready', targetGroupId: 'tg-1' },
      ],
    });

    const { GET } = await import('@/app/api/platform/projects/[platformProjectId]/dashboard/route');
    const res = await GET(new Request('http://localhost/api/platform/projects/p1/dashboard'), {
      params: Promise.resolve({ platformProjectId: 'p1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platformProject.name).toBe('Acme');
    expect(body.checkion?.scanCount).toBe(3);
    expect(body.audion?.personaCount).toBe(2);
    expect(body.audion?.targetGroupCount).toBe(1);
    expect(body.audion?.targetGroups).toHaveLength(1);
    expect(body.audion?.personas[0]?.name).toBe('Alex');
    expect(body.links.audionProject).toContain('platformCompanyId=c1');
    expect(body.links.audionProject).toContain('platformProjectHint=p1');
  });

  it('marks AUDION linked from binding when live summary is null', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1', role: 'user' });
    vi.mocked(userCanViewPlatformProject).mockResolvedValue(true);
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'p1',
      companyId: 'c1',
      name: 'test3',
      domain: null,
      metadata: null,
      status: 'active',
      createdByUserId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);
    vi.mocked(getBindingsForPlatformProject).mockResolvedValue([
      {
        platformProjectId: 'p1',
        productId: 'audion',
        externalProjectId: 'proj-test3-ms8ysh2m',
        syncStatus: 'in_sync',
        syncMessage: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platformProjectId: 'p1',
        productId: 'checkion',
        externalProjectId: null,
        syncStatus: 'failed',
        syncMessage: 'HTTP 401',
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(fetchCheckionPlatformProjectSummary).mockResolvedValue(null);
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue(null);

    const { GET } = await import('@/app/api/platform/projects/[platformProjectId]/dashboard/route');
    const res = await GET(new Request('http://localhost/api/platform/projects/p1/dashboard'), {
      params: Promise.resolve({ platformProjectId: 'p1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.audion).toEqual({
      externalProjectId: 'proj-test3-ms8ysh2m',
      personaCount: 0,
      targetGroupCount: 0,
      targetGroups: [],
      personas: [],
    });
    expect(body.checkion).toBeNull();
    expect(body.links.audionProject).toContain('platformProjectHint=p1');
  });
});
