import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
  replaceKnowledgePackFacets,
} from '@/lib/db/collection-knowledge-packs';
import { getRequestUser } from '@/lib/auth-request-user';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import {
  createEmptyFacets,
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  toKnowledgePackResponse,
} from '@/lib/collection-knowledge-pack';
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/collection-knowledge-packs', () => ({
  getOrCreateKnowledgePack: vi.fn(),
  patchKnowledgePackFacet: vi.fn(),
  replaceKnowledgePackFacets: vi.fn(),
}));

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
  isAdmin: vi.fn((u: { role?: string } | null) => u?.role === 'admin'),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
}));

vi.mock('@/lib/collection-knowledge-pack-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/collection-knowledge-pack-auth')>();
  return {
    ...actual,
    userCanEditKnowledgePack: vi.fn(),
  };
});

function serviceHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Service-Secret': 'svc-secret',
    'X-Plexon-Contract-Version': PLEXON_FEDERATION_CONTRACT_VERSION,
  };
}

function packRow(revision = 1) {
  const at = new Date('2026-08-03T10:00:00.000Z');
  return {
    id: 'pack-1',
    platformProjectId: 'pp-1',
    revision,
    schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
    facets: createEmptyFacets(at.toISOString()),
    updatedAt: at,
    updatedByUserId: null,
  };
}

describe('Collection Knowledge Pack API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'svc-secret');
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      companyId: 'co-1',
      name: 'Acme',
      domain: 'acme.test',
      metadata: null,
      status: 'active',
      createdByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getOrCreateKnowledgePack).mockResolvedValue(packRow());
    vi.mocked(userCanViewPlatformProject).mockResolvedValue(true);
    vi.mocked(userCanEditKnowledgePack).mockResolvedValue(true);
  });

  it('GET knowledge with service secret returns pack', async () => {
    const { GET } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/route'
    );
    const res = await GET(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge', {
        headers: serviceHeaders(),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platformProjectId).toBe('pp-1');
    expect(body.schemaVersion).toBe(KNOWLEDGE_PACK_SCHEMA_VERSION);
    expect(body.facets.brand.data.status).toBe('reserved');
    expect(body.revision).toBe(1);
  });

  it('GET knowledge rejects bad contract for service', async () => {
    const { GET } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/route'
    );
    const res = await GET(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge', {
        headers: {
          'X-Service-Secret': 'svc-secret',
          'X-Plexon-Contract-Version': 'wrong',
        },
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );
    expect(res.status).toBe(400);
  });

  it('PATCH profile via service merge increments revision', async () => {
    const next = packRow(2);
    const facets = createEmptyFacets();
    facets.profile.data.displayName = 'Acme Brand';
    next.facets = facets;
    vi.mocked(patchKnowledgePackFacet).mockResolvedValue(next);

    const { PATCH } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/route'
    );
    const res = await PATCH(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge/facets/profile', {
        method: 'PATCH',
        headers: serviceHeaders(),
        body: JSON.stringify({
          mode: 'merge',
          expectedRevision: 1,
          provenance: { actorType: 'service', productId: 'checkion' },
          data: { displayName: 'Acme Brand', primaryDomain: 'acme.test' },
        }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', facetId: 'profile' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revision).toBe(2);
    expect(body.facets.profile.data.displayName).toBe('Acme Brand');
  });

  it('rejects brand facet writes', async () => {
    const { PATCH } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/route'
    );
    const res = await PATCH(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge/facets/brand', {
        method: 'PATCH',
        headers: serviceHeaders(),
        body: JSON.stringify({
          mode: 'replace',
          expectedRevision: 1,
          provenance: { actorType: 'service', productId: 'brandion' },
          data: { status: 'active' },
        }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', facetId: 'brand' }) }
    );
    expect(res.status).toBe(422);
  });

  it('publish research_brief requires audion productId', async () => {
    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/publish/route'
    );
    const denied = await POST(
      new Request(
        'http://localhost/api/platform/projects/pp-1/knowledge/facets/research_brief/publish',
        {
          method: 'POST',
          headers: serviceHeaders(),
          body: JSON.stringify({
            mode: 'replace',
            expectedRevision: 1,
            provenance: { actorType: 'service', productId: 'checkion' },
            data: { summary: 'nope' },
          }),
        }
      ),
      { params: Promise.resolve({ platformProjectId: 'pp-1', facetId: 'research_brief' }) }
    );
    expect(denied.status).toBe(403);

    const next = packRow(2);
    vi.mocked(patchKnowledgePackFacet).mockResolvedValue(next);
    const ok = await POST(
      new Request(
        'http://localhost/api/platform/projects/pp-1/knowledge/facets/research_brief/publish',
        {
          method: 'POST',
          headers: serviceHeaders(),
          body: JSON.stringify({
            mode: 'replace',
            expectedRevision: 1,
            provenance: { actorType: 'service', productId: 'audion', runId: 'run-1' },
            data: { summary: 'Brief', sections: [], topics: ['a'] },
          }),
        }
      ),
      { params: Promise.resolve({ platformProjectId: 'pp-1', facetId: 'research_brief' }) }
    );
    expect(ok.status).toBe(200);
  });

  it('returns 409 on revision conflict', async () => {
    vi.mocked(patchKnowledgePackFacet).mockResolvedValue('conflict');
    const { PATCH } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/route'
    );
    const res = await PATCH(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge/facets/competitive', {
        method: 'PATCH',
        headers: serviceHeaders(),
        body: JSON.stringify({
          mode: 'merge',
          expectedRevision: 99,
          provenance: { actorType: 'service', productId: 'checkion' },
          data: { competitors: [{ host: 'rival.test', source: 'checkion' }] },
        }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', facetId: 'competitive' }) }
    );
    expect(res.status).toBe(409);
  });

  it('session GET works without service secret', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u-1', role: 'user' });
    const { GET } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/route'
    );
    const res = await GET(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge'),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );
    expect(res.status).toBe(200);
  });

  it('admin PUT replace requires expectedRevision', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    vi.mocked(replaceKnowledgePackFacets).mockResolvedValue(packRow(2));
    const { PUT } = await import(
      '@/app/api/platform/projects/[platformProjectId]/knowledge/route'
    );
    const bad = await PUT(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facets: {} }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );
    expect(bad.status).toBe(400);

    const ok = await PUT(
      new Request('http://localhost/api/platform/projects/pp-1/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'If-Match': '1' },
        body: JSON.stringify({
          expectedRevision: 1,
          facets: {
            profile: { data: { displayName: 'New', aliases: [], markets: [], languages: [] } },
          },
        }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );
    expect(ok.status).toBe(200);
  });
});

describe('knowledge pack helpers', () => {
  it('toKnowledgePackResponse keeps brand reserved', () => {
    const row = packRow();
    const res = toKnowledgePackResponse(row);
    expect(res.facets.brand.data.status).toBe('reserved');
    expect(res.facets.profile.data.displayName).toBe('');
  });
});
