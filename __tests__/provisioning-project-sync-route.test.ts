import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/collection-knowledge-pack-auth', () => ({
  isServiceSecretAuthorized: vi.fn(() => true),
  hasValidContractHeader: vi.fn(() => true),
}));

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
}));

vi.mock('@/lib/platform-project-sync-service', () => ({
  syncPlatformProjectToProducts: vi.fn(),
}));

vi.mock('@/lib/platform-contract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/platform-contract')>()
  return {
    ...actual,
    platformJson: (body: unknown) => actual.platformJson(body),
  }
});

describe('POST /api/platform/provisioning/projects/:id/sync (P73)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('syncs sibling products for one accessible Collection', async () => {
    const projects = await import('@/lib/db/platform-projects');
    const access = await import('@/lib/platform-project-access');
    const sync = await import('@/lib/platform-project-sync-service');
    vi.mocked(projects.getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      name: 'MSQ DX',
    } as never);
    vi.mocked(access.userCanViewPlatformProject).mockResolvedValue(true);
    vi.mocked(sync.syncPlatformProjectToProducts).mockResolvedValue([
      { platformProjectId: 'pp-1', productId: 'creation', ok: true },
      { platformProjectId: 'pp-1', productId: 'brandion', ok: true },
    ]);

    const { POST } = await import(
      '@/app/api/platform/provisioning/projects/[platformProjectId]/sync/route'
    );
    const req = new NextRequest('http://plexon.test/api/platform/provisioning/projects/pp-1/sync', {
      method: 'POST',
      headers: { 'X-Plexon-User-Id': 'user-1', 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await POST(req, { params: Promise.resolve({ platformProjectId: 'pp-1' }) });
    expect(res.status).toBe(200);
    expect(sync.syncPlatformProjectToProducts).toHaveBeenCalledWith('pp-1', {
      source: 'plexon-provisioning-project-sync',
      onlyProducts: undefined,
    });
    const body = await res.json();
    expect(body.synced).toBe(1);
    expect(body.results).toHaveLength(2);
  });

  it('forbids when user cannot view the Collection', async () => {
    const projects = await import('@/lib/db/platform-projects');
    const access = await import('@/lib/platform-project-access');
    vi.mocked(projects.getPlatformProjectById).mockResolvedValue({ id: 'pp-1' } as never);
    vi.mocked(access.userCanViewPlatformProject).mockResolvedValue(false);

    const { POST } = await import(
      '@/app/api/platform/provisioning/projects/[platformProjectId]/sync/route'
    );
    const req = new NextRequest('http://plexon.test/api/platform/provisioning/projects/pp-1/sync', {
      method: 'POST',
      headers: { 'X-Plexon-User-Id': 'user-1' },
    });
    const res = await POST(req, { params: Promise.resolve({ platformProjectId: 'pp-1' }) });
    expect(res.status).toBe(403);
  });
});
