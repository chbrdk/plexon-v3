import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCompanyIdsForUser } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import {
  createPlatformProject,
  deletePlatformProject,
  getPlatformProjectById,
} from '@/lib/db/platform-projects';
import {
  ensureBindingPlaceholders,
  findPlatformProjectIdByProductExternal,
  getExternalProjectId,
  upsertPlatformProjectBinding,
} from '@/lib/db/platform-project-bindings';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract';

vi.mock('@/lib/db/companies', () => ({
  getCompanyIdsForUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/platform-projects', () => ({
  createPlatformProject: vi.fn(),
  deletePlatformProject: vi.fn(),
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/platform-project-bindings', () => ({
  ensureBindingPlaceholders: vi.fn(),
  findPlatformProjectIdByProductExternal: vi.fn(),
  getExternalProjectId: vi.fn(),
  upsertPlatformProjectBinding: vi.fn(),
}));

vi.mock('@/lib/platform-project-sync-service', () => ({
  syncPlatformProjectToProducts: vi.fn(),
}));

function mockOwnerDb() {
  vi.mocked(getDb).mockReturnValue({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'owner-1' }],
        }),
      }),
    }),
  } as ReturnType<typeof getDb>);
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Service-Secret': 'svc-secret',
    'X-Plexon-Contract-Version': PLEXON_FEDERATION_CONTRACT_VERSION,
  };
}

describe('POST /api/platform/provisioning/audion-project-origin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'svc-secret');
    mockOwnerDb();
    vi.mocked(getCompanyIdsForUser).mockResolvedValue(['comp-a']);
    vi.mocked(findPlatformProjectIdByProductExternal).mockResolvedValue(null);
    vi.mocked(createPlatformProject).mockResolvedValue(undefined);
    vi.mocked(ensureBindingPlaceholders).mockResolvedValue(undefined);
    vi.mocked(upsertPlatformProjectBinding).mockResolvedValue(undefined);
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      {
        platformProjectId: 'pp-new',
        productId: 'checkion',
        ok: true,
        externalProjectId: 'chk-99',
      },
    ]);
  });

  it('returns 401 without service secret', async () => {
    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when contract version header is wrong', async () => {
    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': 'svc-secret',
          'X-Plexon-Contract-Version': 'wrong',
        },
        body: JSON.stringify({
          audionProjectId: 'a1',
          name: 'N',
          ownerPlexonUserId: 'owner-1',
          platformCompanyId: 'comp-a',
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 and CHECKION id on success', async () => {
    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          audionProjectId: 'audion-proj-1',
          name: 'My brand',
          ownerPlexonUserId: 'owner-1',
          platformCompanyId: 'comp-a',
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.checkionProjectId).toBe('chk-99');
    expect(body.platformCompanyId).toBe('comp-a');
    expect(typeof body.platformProjectId).toBe('string');
    expect(vi.mocked(syncPlatformProjectToProducts)).toHaveBeenCalledWith(
      body.platformProjectId,
      expect.objectContaining({ onlyProducts: ['checkion'] })
    );
  });

  it('returns existing platform project when audion binding already exists', async () => {
    vi.mocked(findPlatformProjectIdByProductExternal).mockResolvedValue('pp-old');
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-old',
      companyId: 'comp-a',
      name: 'Old',
      domain: null,
      metadata: null,
      status: 'active',
      createdByUserId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);
    vi.mocked(getExternalProjectId).mockResolvedValue('chk-old');

    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          audionProjectId: 'audion-dup',
          name: 'N',
          ownerPlexonUserId: 'owner-1',
          platformCompanyId: 'comp-a',
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platformProjectId).toBe('pp-old');
    expect(body.checkionProjectId).toBe('chk-old');
    expect(vi.mocked(createPlatformProject)).not.toHaveBeenCalled();
  });

  it('deletes platform project and returns 502 when CHECKION sync fails', async () => {
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      {
        platformProjectId: 'pp-new',
        productId: 'checkion',
        ok: false,
        error: 'unreachable',
      },
    ]);

    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          audionProjectId: 'audion-fail',
          name: 'N',
          ownerPlexonUserId: 'owner-1',
          platformCompanyId: 'comp-a',
        }),
      })
    );
    expect(res.status).toBe(502);
    expect(vi.mocked(deletePlatformProject)).toHaveBeenCalled();
  });
});
