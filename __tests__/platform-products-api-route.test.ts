import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProductSummariesForUser } from '@/lib/platform-product-registry';

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/platform-product-registry', () => ({
  getPlatformProductSummariesForUser: vi.fn(),
}));

describe('platform products api route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects anonymous callers', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const { GET } = await import('@/app/api/platform/products/route');
    const response = await GET(new Request('http://localhost/api/platform/products'));
    expect(response.status).toBe(401);
  });

  it('returns viewer-aware product summaries', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1', role: 'user' });
    vi.mocked(getPlatformProductSummariesForUser).mockResolvedValue([
      {
        id: 'checkion',
        name: 'CHECKION',
        descriptionKey: 'dashboard.productCheckionDescription',
        lifecycle: 'active',
        surface: 'federated',
        promoted: true,
        primaryActionKey: 'dashboard.openCheckion',
        homeUrl: 'https://checkion.example.com/',
        loginUrl: 'https://checkion.example.com/login',
        healthUrl: 'https://checkion.example.com/api/health',
        capabilities: [],
        entryPoints: [],
        defaultAccess: 'granted',
        runtimeStatus: 'healthy',
        runtimeMessage: 'dashboard.runtime.healthy',
        reachable: true,
        access: {
          status: 'granted',
          visible: true,
          launchable: true,
          platformRole: 'member',
          source: 'default',
        },
        launchContext: {
          platformRole: 'member',
          projectId: 'project-1',
        },
      },
    ]);

    const { GET } = await import('@/app/api/platform/products/route');
    const response = await GET(new Request('http://localhost/api/platform/products'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.viewer).toEqual({ id: 'user-1', role: 'user' });
    expect(data.products[0].access.status).toBe('granted');
    expect(data.products[0].launchContext.projectId).toBe('project-1');
  });
});
