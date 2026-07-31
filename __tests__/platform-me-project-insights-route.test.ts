import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestUser } from '@/lib/auth-request-user';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/platform-project-directory', () => ({
  listAccessiblePlatformProjectsForUser: vi.fn(),
}));

vi.mock('@/lib/platform-project-dashboard-fetch', () => ({
  fetchCheckionPlatformProjectSummary: vi.fn(),
  fetchAudionPlatformProjectSummary: vi.fn(),
}));

vi.mock('@/lib/db/platform-project-bindings', () => ({
  getBindingsForPlatformProject: vi.fn().mockResolvedValue([]),
}));

describe('GET /api/platform/me/project-insights', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const { GET } = await import('@/app/api/platform/me/project-insights/route');
    const res = await GET(new Request('http://localhost/api/platform/me/project-insights'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when database is not configured', async () => {
    vi.unstubAllEnvs();
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1', role: 'user' });
    const { GET } = await import('@/app/api/platform/me/project-insights/route');
    const res = await GET(new Request('http://localhost/api/platform/me/project-insights'));
    expect(res.status).toBe(503);
  });

  it('aggregates summaries for accessible Collections (capped)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1', role: 'user' });
    const now = new Date();
    const rows = Array.from({ length: 32 }, (_, i) => ({
      id: `p${i}`,
      companyId: 'c1',
      name: `Proj ${i}`,
      domain: `p${i}.test`,
      metadata: null,
      status: 'active' as const,
      createdByUserId: 'u1',
      createdAt: now,
      updatedAt: now,
    }));
    vi.mocked(listAccessiblePlatformProjectsForUser).mockResolvedValue(rows);
    vi.mocked(fetchCheckionPlatformProjectSummary).mockImplementation(async (id) => ({
      externalProjectId: `chk-${id}`,
      scanCount: 1,
      domainScanCount: 0,
      standaloneScanCount: 1,
      domainScans: [],
      standaloneScans: [],
    }));
    vi.mocked(fetchAudionPlatformProjectSummary).mockImplementation(async (id) => ({
      externalProjectId: `aud-${id}`,
      personaCount: 2,
      targetGroupCount: 1,
      targetGroups: [],
      personas: [],
    }));

    const { GET } = await import('@/app/api/platform/me/project-insights/route');
    const res = await GET(new Request('http://localhost/api/platform/me/project-insights'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalAccessible).toBe(32);
    expect(body.truncated).toBe(true);
    expect(body.shown).toBe(30);
    expect(body.projects).toHaveLength(30);
    expect(body.projects[0].checkion?.scanCount).toBe(1);
    expect(body.projects[0].openPlatformProject).toBe(true);
    expect(body.projects[0].links.checkionProject).toContain('platformProjectHint=');
    expect(body.projects[0].links.audionProject).toContain('platformCompanyId=c1');
    expect(body.projects[0].links.audionProject).toContain('platformProjectHint=p0');
  });

  it('returns empty list when user has no Collections (no product-only fallback)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u-plexon', role: 'user' });
    vi.mocked(listAccessiblePlatformProjectsForUser).mockResolvedValue([]);

    const { GET } = await import('@/app/api/platform/me/project-insights/route');
    const res = await GET(new Request('http://localhost/api/platform/me/project-insights'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalAccessible).toBe(0);
    expect(body.projects).toEqual([]);
    expect(fetchCheckionPlatformProjectSummary).not.toHaveBeenCalled();
    expect(fetchAudionPlatformProjectSummary).not.toHaveBeenCalled();
  });
});
