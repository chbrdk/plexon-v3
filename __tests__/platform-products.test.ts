import { afterEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLE } from '@/lib/db/schema';
import { PLATFORM_ROLE } from '@/lib/platform-entitlements';

describe('platform product registry', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('exposes shell navigation including the product catalog', async () => {
    const { PLEXON_SHELL_NAV_ITEMS } = await import('@/lib/platform-products');
    expect(PLEXON_SHELL_NAV_ITEMS.some((item) => item.path === '/products')).toBe(true);
  });

  it('hides admin-only shell nav items for non-admin users', async () => {
    const { PLEXON_SHELL_NAV_ITEMS, filterPlexonShellNavItemsForRole } = await import('@/lib/platform-products');
    const userNav = filterPlexonShellNavItemsForRole(PLEXON_SHELL_NAV_ITEMS, USER_ROLE.USER);
    expect(userNav.some((item) => item.path === '/board')).toBe(false);
    expect(userNav.some((item) => item.path === '/design-system')).toBe(false);
    expect(userNav.some((item) => item.path === '/products')).toBe(true);
    expect(userNav.some((item) => item.path === '/assistant')).toBe(true);
  });

  it('shows admin-only shell nav items for admins', async () => {
    const { PLEXON_SHELL_NAV_ITEMS, filterPlexonShellNavItemsForRole } = await import('@/lib/platform-products');
    const adminNav = filterPlexonShellNavItemsForRole(PLEXON_SHELL_NAV_ITEMS, USER_ROLE.ADMIN);
    expect(adminNav.some((item) => item.path === '/board')).toBe(true);
    expect(adminNav.some((item) => item.path === '/design-system')).toBe(true);
  });

  it('keeps future products planned until URLs are configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_VIDEON_URL', '');
    vi.stubEnv('NEXT_PUBLIC_BRANDION_URL', '');
    const { getStaticPlatformProductSummaries } = await import('@/lib/platform-products');
    const summaries = getStaticPlatformProductSummaries();
    const videon = summaries.find((product) => product.id === 'videon');
    const brandion = summaries.find((product) => product.id === 'brandion');
    expect(videon?.runtimeStatus).toBe('planned');
    expect(brandion?.runtimeStatus).toBe('planned');
  });

  it('uses configured future product URLs from env', async () => {
    vi.stubEnv('NEXT_PUBLIC_VIDEON_URL', 'https://videon.example.com/');
    vi.stubEnv('NEXT_PUBLIC_BRANDION_URL', 'https://brandion.example.com/');
    const { getPlatformProductDefinitions } = await import('@/lib/platform-products');
    const definitions = getPlatformProductDefinitions();
    const videon = definitions.find((product) => product.id === 'videon');
    const brandion = definitions.find((product) => product.id === 'brandion');
    expect(videon?.homeUrl).toBe('https://videon.example.com/');
    expect(brandion?.homeUrl).toBe('https://brandion.example.com/');
    expect(videon?.lifecycle).toBe('active');
    expect(brandion?.lifecycle).toBe('active');
  });

  it('hides future products until an explicit entitlement exists', async () => {
    const { getStaticPlatformProductSummaries } = await import('@/lib/platform-products');
    const summaries = getStaticPlatformProductSummaries();
    const videon = summaries.find((product) => product.id === 'videon');
    expect(videon?.access.status).toBe('hidden');
    expect(videon?.access.visible).toBe(false);
  });

  it('applies explicit disablement and launch context from entitlements', async () => {
    const { getPlatformProductDefinitions, resolvePlatformProductAccess, resolvePlatformLaunchContext } =
      await import('@/lib/platform-products');
    const checkion = getPlatformProductDefinitions().find((product) => product.id === 'checkion');
    expect(checkion).toBeTruthy();

    const disabledAccess = resolvePlatformProductAccess(checkion!, {
      entitlement: {
        userId: 'user-1',
        productId: 'checkion',
        status: 'disabled',
        platformRole: PLATFORM_ROLE.MANAGER,
        defaultContext: { entryPointId: 'checkion-projects', projectId: 'proj-42' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    expect(disabledAccess.status).toBe('disabled');
    expect(disabledAccess.launchable).toBe(false);

    const grantedAccess = resolvePlatformProductAccess(checkion!, {
      entitlement: {
        userId: 'user-1',
        productId: 'checkion',
        status: 'active',
        platformRole: PLATFORM_ROLE.MANAGER,
        defaultContext: { entryPointId: 'checkion-projects', projectId: 'proj-42' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const launchContext = resolvePlatformLaunchContext(checkion!, grantedAccess, {
      userId: 'user-1',
      productId: 'checkion',
      status: 'active',
      platformRole: PLATFORM_ROLE.MANAGER,
      defaultContext: { entryPointId: 'checkion-projects', projectId: 'proj-42' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(launchContext).toMatchObject({
      entryPointId: 'checkion-projects',
      projectId: 'proj-42',
      platformRole: PLATFORM_ROLE.MANAGER,
    });
  });
});
