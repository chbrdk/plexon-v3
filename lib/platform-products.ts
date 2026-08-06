import {
  getAudionAdminUrl,
  getBrandionUrl,
  getCheckionUrl,
  getVideonUrl,
  PATH_ASSISTANT,
  PATH_BOARD,
  PATH_DESIGN_SYSTEM,
  PATH_EVENT_QUICK_CHECK,
  PATH_HOME,
  PATH_PRODUCTS,
  PATH_SETTINGS,
} from '@/lib/constants';
import { USER_ROLE } from '@/lib/db/schema';
import {
  PLATFORM_ACCESS_STATUS,
  PLATFORM_ROLE,
  type PlatformLaunchPayload,
  type PlatformProductAccess,
  type PlatformProductId,
  type StoredPlatformEntitlement,
} from '@/lib/platform-entitlements';

export type PlatformProductLifecycle = 'active' | 'planned';
export type PlatformProductSurface = 'native' | 'federated';
export type PlatformProductRuntimeStatus = 'healthy' | 'planned' | 'not_configured' | 'unreachable';
export type PlatformProductDefaultAccess = 'granted' | 'hidden';

export type PlatformProductEntryPoint = {
  id: string;
  labelKey: string;
  href: string;
  openInNewTab: boolean;
};

export type PlatformProductDefinition = {
  id: PlatformProductId;
  name: string;
  descriptionKey: string;
  lifecycle: PlatformProductLifecycle;
  surface: PlatformProductSurface;
  promoted: boolean;
  primaryActionKey: string;
  homeUrl: string | null;
  loginUrl: string | null;
  healthUrl: string | null;
  capabilities: string[];
  entryPoints: PlatformProductEntryPoint[];
  defaultAccess: PlatformProductDefaultAccess;
};

export type PlatformProductSummary = PlatformProductDefinition & {
  runtimeStatus: PlatformProductRuntimeStatus;
  runtimeMessage: string;
  reachable: boolean;
  access: PlatformProductAccess;
  launchContext: PlatformLaunchPayload | null;
};

export type PlexonShellNavItem = {
  labelKey: string;
  path: string;
  icon: string;
  section: 'primary' | 'secondary';
  /** When true, item is shown only to users with global admin role. */
  adminOnly?: boolean;
};

type AccessResolutionOptions = {
  viewerRole?: string | null;
  entitlement?: StoredPlatformEntitlement | null;
};

export const PLEXON_SHELL_NAV_ITEMS: PlexonShellNavItem[] = [
  { labelKey: 'nav.dashboard', path: PATH_HOME, icon: 'dashboard', section: 'primary' },
  { labelKey: 'nav.assistant', path: PATH_ASSISTANT, icon: 'smart_toy', section: 'primary' },
  {
    labelKey: 'nav.eventQuickCheck',
    path: PATH_EVENT_QUICK_CHECK,
    icon: 'bolt',
    section: 'primary',
  },
  { labelKey: 'nav.products', path: PATH_PRODUCTS, icon: 'apps', section: 'primary' },
  { labelKey: 'nav.board', path: PATH_BOARD, icon: 'widgets', section: 'primary', adminOnly: true },
  {
    labelKey: 'nav.designSystem',
    path: PATH_DESIGN_SYSTEM,
    icon: 'widgets',
    section: 'primary',
    adminOnly: true,
  },
  { labelKey: 'nav.settings', path: PATH_SETTINGS, icon: 'settings', section: 'secondary' },
];

export function filterPlexonShellNavItemsForRole(
  items: PlexonShellNavItem[],
  viewerRole?: string | null
): PlexonShellNavItem[] {
  if (viewerRole === USER_ROLE.ADMIN) return items;
  return items.filter((item) => !item.adminOnly);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinUrl(base: string | null, path: string): string | null {
  if (!base) return null;
  return `${trimTrailingSlash(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

function getAudionBaseUrl(): string {
  const adminUrl = trimTrailingSlash(getAudionAdminUrl());
  return adminUrl.endsWith('/admin') ? adminUrl.slice(0, -'/admin'.length) || adminUrl : adminUrl;
}

export function getPlatformProductDefinitions(): PlatformProductDefinition[] {
  const checkionUrl = getCheckionUrl();
  const audionAdminUrl = getAudionAdminUrl();
  const audionBaseUrl = getAudionBaseUrl();
  const videonUrl = getVideonUrl();
  const brandionUrl = getBrandionUrl();

  return [
    {
      id: 'plexon',
      name: 'PLEXON',
      descriptionKey: 'dashboard.productPlexonDescription',
      lifecycle: 'active',
      surface: 'native',
      promoted: false,
      primaryActionKey: 'dashboard.openPlexon',
      homeUrl: PATH_HOME,
      loginUrl: null,
      healthUrl: '/api/health',
      capabilities: [
        'dashboard.capabilityIdentity',
        'dashboard.capabilityProfile',
        'dashboard.capabilityUsage',
        'dashboard.capabilityRegistry',
      ],
      entryPoints: [
        { id: 'plexon-home', labelKey: 'dashboard.entry.dashboard', href: PATH_HOME, openInNewTab: false },
        { id: 'plexon-products', labelKey: 'dashboard.entry.products', href: PATH_PRODUCTS, openInNewTab: false },
        { id: 'plexon-settings', labelKey: 'dashboard.entry.settings', href: PATH_SETTINGS, openInNewTab: false },
      ],
      defaultAccess: 'granted',
    },
    {
      id: 'checkion',
      name: 'CHECKION',
      descriptionKey: 'dashboard.productCheckionDescription',
      lifecycle: 'active',
      surface: 'federated',
      promoted: true,
      primaryActionKey: 'dashboard.openCheckion',
      homeUrl: checkionUrl,
      loginUrl: joinUrl(checkionUrl, '/login'),
      healthUrl: joinUrl(checkionUrl, '/api/health'),
      capabilities: [
        'dashboard.capabilityCentralIdentity',
        'dashboard.capabilityProfileSync',
        'dashboard.capabilityUsage',
        'dashboard.capabilityMcp',
      ],
      entryPoints: [
        { id: 'checkion-home', labelKey: 'dashboard.entry.home', href: checkionUrl, openInNewTab: true },
        { id: 'checkion-scan', labelKey: 'dashboard.entry.scan', href: joinUrl(checkionUrl, '/scan') ?? checkionUrl, openInNewTab: true },
        { id: 'checkion-projects', labelKey: 'dashboard.entry.projects', href: joinUrl(checkionUrl, '/projects') ?? checkionUrl, openInNewTab: true },
        { id: 'checkion-settings', labelKey: 'dashboard.entry.settings', href: joinUrl(checkionUrl, '/settings') ?? checkionUrl, openInNewTab: true },
      ],
      defaultAccess: 'granted',
    },
    {
      id: 'audion',
      name: 'AUDION',
      descriptionKey: 'dashboard.productAudionDescription',
      lifecycle: 'active',
      surface: 'federated',
      promoted: true,
      primaryActionKey: 'dashboard.openAudion',
      homeUrl: audionAdminUrl,
      loginUrl: joinUrl(audionBaseUrl, '/login'),
      healthUrl: joinUrl(audionBaseUrl, '/api/health'),
      capabilities: [
        'dashboard.capabilityCentralIdentity',
        'dashboard.capabilityProfileSync',
        'dashboard.capabilityUsage',
        'dashboard.capabilityProjectScoped',
      ],
      entryPoints: [
        { id: 'audion-admin', labelKey: 'dashboard.entry.admin', href: audionAdminUrl, openInNewTab: true },
        { id: 'audion-personas', labelKey: 'dashboard.entry.personas', href: joinUrl(audionBaseUrl, '/admin/personas') ?? audionAdminUrl, openInNewTab: true },
        { id: 'audion-projects', labelKey: 'dashboard.entry.projects', href: joinUrl(audionBaseUrl, '/admin/projects') ?? audionAdminUrl, openInNewTab: true },
        { id: 'audion-chat', labelKey: 'dashboard.entry.chat', href: joinUrl(audionBaseUrl, '/chat') ?? audionAdminUrl, openInNewTab: true },
      ],
      defaultAccess: 'granted',
    },
    {
      id: 'videon',
      name: 'VIDEON',
      descriptionKey: 'dashboard.productVideonDescription',
      lifecycle: videonUrl ? 'active' : 'planned',
      surface: 'federated',
      promoted: true,
      primaryActionKey: 'dashboard.openVideon',
      homeUrl: videonUrl,
      loginUrl: joinUrl(videonUrl, '/login'),
      healthUrl: joinUrl(videonUrl, '/api/health'),
      capabilities: [
        'dashboard.capabilityCentralIdentity',
        'dashboard.capabilityUsage',
        'dashboard.capabilityFutureRegistry',
      ],
      entryPoints: [
        { id: 'videon-home', labelKey: 'dashboard.entry.home', href: videonUrl ?? '#', openInNewTab: true },
      ],
      defaultAccess: 'hidden',
    },
    {
      id: 'brandion',
      name: 'BRANDION',
      descriptionKey: 'dashboard.productBrandionDescription',
      lifecycle: brandionUrl ? 'active' : 'planned',
      surface: 'federated',
      promoted: true,
      primaryActionKey: 'dashboard.openBrandion',
      homeUrl: brandionUrl,
      loginUrl: joinUrl(brandionUrl, '/login'),
      healthUrl: joinUrl(brandionUrl, '/api/health'),
      capabilities: [
        'dashboard.capabilityCentralIdentity',
        'dashboard.capabilityUsage',
        'dashboard.capabilityFutureRegistry',
      ],
      entryPoints: [
        { id: 'brandion-home', labelKey: 'dashboard.entry.home', href: brandionUrl ?? '#', openInNewTab: true },
        {
          id: 'brandion-projects',
          labelKey: 'dashboard.entry.projects',
          href: joinUrl(brandionUrl, '/projects') ?? brandionUrl ?? '#',
          openInNewTab: true,
        },
      ],
      defaultAccess: 'hidden',
    },
  ];
}

export function resolvePlatformProductAccess(
  product: PlatformProductDefinition,
  options: AccessResolutionOptions = {}
): PlatformProductAccess {
  const viewerRole = options.viewerRole ?? null;
  const entitlement = options.entitlement ?? null;
  const hasLaunchTarget = product.entryPoints.some((entryPoint) => Boolean(entryPoint.href && entryPoint.href !== '#'));

  if (viewerRole === 'admin') {
    return {
      status: PLATFORM_ACCESS_STATUS.GRANTED,
      visible: true,
      launchable: hasLaunchTarget,
      platformRole: entitlement?.platformRole ?? PLATFORM_ROLE.ADMIN,
      source: 'admin',
    };
  }

  if (entitlement) {
    if (entitlement.status === 'disabled') {
      return {
        status: PLATFORM_ACCESS_STATUS.DISABLED,
        visible: true,
        launchable: false,
        platformRole: entitlement.platformRole,
        source: 'explicit',
      };
    }
    return {
      status: PLATFORM_ACCESS_STATUS.GRANTED,
      visible: true,
      launchable: hasLaunchTarget,
      platformRole: entitlement.platformRole,
      source: 'explicit',
    };
  }

  if (product.defaultAccess === 'hidden') {
    return {
      status: PLATFORM_ACCESS_STATUS.HIDDEN,
      visible: false,
      launchable: false,
      platformRole: null,
      source: 'default',
    };
  }

  return {
    status: PLATFORM_ACCESS_STATUS.GRANTED,
    visible: true,
    launchable: hasLaunchTarget,
    platformRole: PLATFORM_ROLE.MEMBER,
    source: 'default',
  };
}

export function resolvePlatformLaunchContext(
  product: PlatformProductDefinition,
  access: PlatformProductAccess,
  entitlement?: StoredPlatformEntitlement | null
): PlatformLaunchPayload | null {
  if (access.status !== PLATFORM_ACCESS_STATUS.GRANTED) return null;
  const defaultContext = entitlement?.defaultContext ?? null;
  if (!defaultContext && !access.platformRole) return null;

  const validEntryPointId =
    defaultContext?.entryPointId && product.entryPoints.some((entryPoint) => entryPoint.id === defaultContext.entryPointId)
      ? defaultContext.entryPointId
      : null;

  return {
    entryPointId: validEntryPointId,
    projectId: defaultContext?.projectId ?? null,
    deepLink: defaultContext?.deepLink ?? null,
    platformRole: access.platformRole,
  };
}

function buildStaticSummary(
  product: PlatformProductDefinition,
  options: AccessResolutionOptions = {}
): PlatformProductSummary {
  const access = resolvePlatformProductAccess(product, options);
  return {
    ...product,
    runtimeStatus: product.lifecycle === 'planned' ? 'planned' : 'not_configured',
    runtimeMessage:
      product.lifecycle === 'planned'
        ? 'dashboard.runtime.planned'
        : product.homeUrl
          ? 'dashboard.runtime.healthUnknown'
          : 'dashboard.runtime.notConfigured',
    reachable: false,
    access,
    launchContext: resolvePlatformLaunchContext(product, access, options.entitlement),
  };
}

export function getStaticPlatformProductSummaries(options: AccessResolutionOptions = {}): PlatformProductSummary[] {
  return getPlatformProductDefinitions().map((product) => buildStaticSummary(product, options));
}

async function getHealthStatus(
  product: PlatformProductDefinition
): Promise<Pick<PlatformProductSummary, 'runtimeStatus' | 'runtimeMessage' | 'reachable'>> {
  if (product.id === 'plexon') {
    return {
      runtimeStatus: 'healthy',
      runtimeMessage: 'dashboard.runtime.healthy',
      reachable: true,
    };
  }
  if (product.lifecycle === 'planned') {
    return {
      runtimeStatus: 'planned',
      runtimeMessage: 'dashboard.runtime.planned',
      reachable: false,
    };
  }
  if (!product.homeUrl || !product.healthUrl) {
    return {
      runtimeStatus: 'not_configured',
      runtimeMessage: 'dashboard.runtime.notConfigured',
      reachable: false,
    };
  }
  try {
    const response = await fetch(product.healthUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        runtimeStatus: 'unreachable',
        runtimeMessage: 'dashboard.runtime.unreachable',
        reachable: false,
      };
    }
    return {
      runtimeStatus: 'healthy',
      runtimeMessage: 'dashboard.runtime.healthy',
      reachable: true,
    };
  } catch {
    return {
      runtimeStatus: 'unreachable',
      runtimeMessage: 'dashboard.runtime.unreachable',
      reachable: false,
    };
  }
}

export async function getPlatformProductSummaries(options: {
  viewerRole?: string | null;
  entitlements?: Partial<Record<PlatformProductId, StoredPlatformEntitlement>>;
} = {}): Promise<PlatformProductSummary[]> {
  const products = getPlatformProductDefinitions();
  const statuses = await Promise.all(products.map((product) => getHealthStatus(product)));
  return products.map((product, index) => {
    const entitlement = options.entitlements?.[product.id] ?? null;
    const access = resolvePlatformProductAccess(product, {
      viewerRole: options.viewerRole,
      entitlement,
    });
    return {
      ...product,
      ...statuses[index],
      access,
      launchContext: resolvePlatformLaunchContext(product, access, entitlement),
    };
  });
}
