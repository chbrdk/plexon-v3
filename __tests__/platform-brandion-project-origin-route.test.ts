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

describe('POST /api/platform/provisioning/brandion-project-origin', () => {
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
    vi.mocked(getExternalProjectId).mockResolvedValue(null);
    vi.mocked(syncPlatformProjectToProducts).mockResolvedValue([
      {
        platformProjectId: 'pp-new',
        productId: 'checkion',
        ok: true,
        externalProjectId: 'chk-99',
      },
      {
        platformProjectId: 'pp-new',
        productId: 'audion',
        ok: true,
        externalProjectId: 'aud-99',
      },
      {
        platformProjectId: 'pp-new',
        productId: 'creation',
        ok: true,
        externalProjectId: 'cre-99',
      },
    ]);
  });

  it('returns 401 without service secret', async () => {
    const { POST } = await import('@/app/api/platform/provisioning/brandion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/brandion-project-origin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 201 and sibling ids on success', async () => {
    const { POST } = await import('@/app/api/platform/provisioning/brandion-project-origin/route');
    const res = await POST(
      new Request('http://localhost/api/platform/provisioning/brandion-project-origin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          brandionProjectId: 'br-1',
          name: 'Brand Project',
          domain: 'brand.example',
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      platformProjectId: expect.any(String),
      checkionProjectId: 'chk-99',
      audionProjectId: 'aud-99',
      creationProjectId: 'cre-99',
      platformCompanyId: 'comp-a',
      ownerPlexonUserId: 'owner-1',
    });
    expect(syncPlatformProjectToProducts).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        onlyProducts: expect.arrayContaining(['checkion', 'audion', 'creation']),
      })
    );
    expect(upsertPlatformProjectBinding).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'brandion',
        externalProjectId: 'br-1',
      })
    );
  });
});
