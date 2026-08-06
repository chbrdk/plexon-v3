import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestUser } from '@/lib/auth-request-user';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getOrCreateKnowledgePack } from '@/lib/db/collection-knowledge-packs';
import { listCollectionTestFlows } from '@/lib/db/collection-test-flows';
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

vi.mock('@/lib/db/collection-knowledge-packs', () => ({
  getOrCreateKnowledgePack: vi.fn(),
}));

vi.mock('@/lib/db/collection-test-flows', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/collection-test-flows')>();
  return {
    ...actual,
    listCollectionTestFlows: vi.fn(),
  };
});

vi.mock('@/lib/platform-project-dashboard-fetch', () => ({
  fetchCheckionPlatformProjectSummary: vi.fn(),
  fetchAudionPlatformProjectSummary: vi.fn(),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
}));

function emptyPackRow(platformProjectId: string) {
  return {
    id: 'pack-1',
    platformProjectId,
    revision: 1,
    schemaVersion: '2026-08-knowledge-pack-v1',
    facets: {},
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedByUserId: null,
  };
}

describe('GET /api/platform/projects/[platformProjectId]/dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.mocked(getOrCreateKnowledgePack).mockResolvedValue(
      emptyPackRow('p1') as Awaited<ReturnType<typeof getOrCreateKnowledgePack>>,
    );
    vi.mocked(listCollectionTestFlows).mockResolvedValue([]);
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
      domainScanCount: 1,
      standaloneScanCount: 2,
      domainScans: [
        {
          id: 'dom-1',
          domain: 'acme.test',
          status: 'complete',
          score: 90,
          timestamp: '2026-07-01T00:00:00.000Z',
          totalPages: 5,
        },
      ],
      standaloneScans: [
        {
          id: 'scan-1',
          url: 'https://acme.test/',
          score: 80,
          timestamp: '2026-07-01T00:00:00.000Z',
        },
      ],
    });
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'aud-1',
      personaCount: 2,
      targetGroupCount: 1,
      journeyCount: 1,
      studyCount: 1,
      targetGroups: [
        { id: 'tg-1', name: 'Buyers', segment: 'B2B', personaCount: 2, status: 'active' },
      ],
      personas: [
        { id: 'p-1', name: 'Alex', role: 'Buyer', status: 'ready', targetGroupId: 'tg-1' },
      ],
      journeys: [
        {
          id: 'j-1',
          name: 'Onboarding',
          status: 'active',
          journeyType: 'standard',
          phaseCount: 3,
          targetGroupName: 'Buyers',
        },
      ],
      studies: [{ id: 's-1', name: 'Checkout study', status: 'active', waveCount: 2, targetUrlKey: null }],
    });
    vi.mocked(listCollectionTestFlows).mockResolvedValue([
      {
        id: 'flow-1',
        platformProjectId: 'p1',
        name: 'Smoke flow',
        templateId: null,
        ownerId: null,
        flow: {
          schemaVersion: '2026-08-collection-flow-v1',
          templateId: 'blank',
          nodes: [],
          edges: [],
          lastRun: {
            startedAt: '2026-08-01T00:00:00.000Z',
            completedAt: '2026-08-01T00:01:00.000Z',
            scanId: null,
            url: 'https://acme.test/',
            status: 'complete',
            overallScore: 88,
          },
        },
        webhookEnabled: false,
        webhookSecretHint: null,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      },
    ] as Awaited<ReturnType<typeof listCollectionTestFlows>>);

    const { GET } = await import('@/app/api/platform/projects/[platformProjectId]/dashboard/route');
    const res = await GET(new Request('http://localhost/api/platform/projects/p1/dashboard'), {
      params: Promise.resolve({ platformProjectId: 'p1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platformProject.name).toBe('Acme');
    expect(body.checkion?.scanCount).toBe(3);
    expect(body.checkion?.domainScans).toHaveLength(1);
    expect(body.checkion?.standaloneScans[0]?.url).toBe('https://acme.test/');
    expect(body.audion?.personaCount).toBe(2);
    expect(body.audion?.targetGroupCount).toBe(1);
    expect(body.audion?.journeyCount).toBe(1);
    expect(body.audion?.studyCount).toBe(1);
    expect(body.audion?.targetGroups).toHaveLength(1);
    expect(body.audion?.personas[0]?.name).toBe('Alex');
    expect(body.audion?.journeys[0]?.name).toBe('Onboarding');
    expect(body.audion?.studies[0]?.name).toBe('Checkout study');
    expect(body.links.audionProject).toContain('platformCompanyId=c1');
    expect(body.links.audionProject).toContain('platformProjectHint=p1');
    expect(body.knowledge?.revision).toBe(1);
    expect(body.knowledge?.facets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ facetId: 'profile', status: 'empty' }),
        expect.objectContaining({ facetId: 'brand', status: 'reserved' }),
      ]),
    );
    expect(body.flows).toEqual({
      count: 1,
      recent: [
        expect.objectContaining({
          id: 'flow-1',
          name: 'Smoke flow',
          lastRunStatus: 'complete',
        }),
      ],
    });
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
      journeyCount: 0,
      studyCount: 0,
      targetGroups: [],
      personas: [],
      journeys: [],
      studies: [],
    });
    expect(body.checkion).toBeNull();
    expect(body.links.audionProject).toContain('platformProjectHint=p1');
    expect(body.knowledge?.facets).toBeDefined();
    expect(body.flows).toEqual({ count: 0, recent: [] });
  });
});
