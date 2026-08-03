import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { resolveProductOriginOwner } from '@/lib/resolve-product-origin-owner';

vi.mock('@/lib/resolve-product-origin-owner', () => ({
  resolveProductOriginOwner: vi.fn(),
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
    vi.mocked(resolveProductOriginOwner).mockResolvedValue({
      ownerPlexonUserId: 'owner-1',
      platformCompanyId: 'comp-a',
      source: 'explicit',
    });
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
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 without owner/company (auto-resolve)', async () => {
    vi.mocked(resolveProductOriginOwner).mockResolvedValue({
      ownerPlexonUserId: 'owner-auto',
      platformCompanyId: 'comp-auto',
      source: 'bootstrap_user_and_company',
    });
    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ audionProjectId: 'a1', name: 'Bosch eBike', domain: 'bosch-ebike.com' }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      platformProjectId: expect.any(String),
      checkionProjectId: 'chk-99',
      platformCompanyId: 'comp-auto',
      ownerPlexonUserId: 'owner-auto',
    });
    expect(resolveProductOriginOwner).toHaveBeenCalledWith({
      ownerPlexonUserId: undefined,
      platformCompanyId: undefined,
    });
    expect(createPlatformProject).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp-auto',
        createdByUserId: 'owner-auto',
        name: 'Bosch eBike',
      })
    );
  });

  it('returns 201 and CHECKION id on success', async () => {
    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          audionProjectId: 'a1',
          name: 'N',
          ownerPlexonUserId: 'owner-1',
          platformCompanyId: 'comp-a',
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.checkionProjectId).toBe('chk-99');
    expect(body.platformCompanyId).toBe('comp-a');
    expect(body.ownerPlexonUserId).toBe('owner-1');
  });

  it('returns existing binding idempotently', async () => {
    vi.mocked(findPlatformProjectIdByProductExternal).mockResolvedValue('pp-existing');
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-existing',
      companyId: 'comp-a',
      name: 'N',
      domain: null,
      status: 'active',
      createdByUserId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);
    vi.mocked(getExternalProjectId).mockResolvedValue('chk-existing');

    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          audionProjectId: 'a1',
          name: 'N',
          ownerPlexonUserId: 'owner-1',
          platformCompanyId: 'comp-a',
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      platformProjectId: 'pp-existing',
      checkionProjectId: 'chk-existing',
      platformCompanyId: 'comp-a',
    });
    expect(createPlatformProject).not.toHaveBeenCalled();
  });

  it('rolls back when CHECKION sync fails', async () => {
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      { platformProjectId: 'x', productId: 'checkion', ok: false, error: 'chk down' },
    ]);
    const { POST } = await import('@/app/api/platform/provisioning/audion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/audion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ audionProjectId: 'a1', name: 'N' }),
      })
    );
    expect(res.status).toBe(502);
    expect(deletePlatformProject).toHaveBeenCalled();
  });
});
