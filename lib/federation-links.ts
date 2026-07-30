import type { PlatformLaunchPayload } from '@/lib/platform-entitlements';

export const PLEXON_SOURCE_PARAM = 'plexon_source';
export const PLEXON_RETURN_TO_PARAM = 'plexon_return_to';
export const PLEXON_ENTRY_POINT_PARAM = 'plexon_entry_point';
export const PLEXON_PLATFORM_ROLE_PARAM = 'plexon_platform_role';
export const PLEXON_SOURCE_VALUE = 'plexon';

function toUrl(href: string): { url: URL; isAbsolute: boolean } | null {
  try {
    const isAbsolute = /^https?:\/\//i.test(href);
    return { url: new URL(href, 'https://plexon.local'), isAbsolute };
  } catch {
    return null;
  }
}

export function appendFederationParams(
  href: string,
  options: {
    returnTo?: string | null;
    source?: string;
    entryPointId?: string | null;
    platformRole?: string | null;
    projectId?: string | null;
  } = {}
): string {
  if (!href || href === '#') return href;
  const source = options.source ?? PLEXON_SOURCE_VALUE;
  const parsed = toUrl(href);
  if (!parsed) return href;
  parsed.url.searchParams.set(PLEXON_SOURCE_PARAM, source);
  if (options.returnTo) {
    parsed.url.searchParams.set(PLEXON_RETURN_TO_PARAM, options.returnTo);
  }
  if (options.entryPointId) {
    parsed.url.searchParams.set(PLEXON_ENTRY_POINT_PARAM, options.entryPointId);
  }
  if (options.platformRole) {
    parsed.url.searchParams.set(PLEXON_PLATFORM_ROLE_PARAM, options.platformRole);
  }
  if (options.projectId) {
    parsed.url.searchParams.set('projectId', options.projectId);
  }
  return parsed.isAbsolute ? parsed.url.toString() : `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
}

function resolveDeepLinkTarget(
  href: string,
  productHomeUrl: string | null,
  deepLink?: string | null
): string {
  if (!deepLink) return href;
  const parsedHome = productHomeUrl ? toUrl(productHomeUrl) : null;
  if (deepLink.startsWith('/')) {
    if (parsedHome?.isAbsolute) {
      return new URL(deepLink, parsedHome.url).toString();
    }
    return deepLink;
  }
  const parsedDeepLink = toUrl(deepLink);
  if (!parsedDeepLink || !parsedDeepLink.isAbsolute) return href;
  if (!parsedHome || parsedHome.url.origin !== parsedDeepLink.url.origin) return href;
  return parsedDeepLink.url.toString();
}

export function buildFederatedLaunchHref(
  href: string,
  options: {
    productHomeUrl?: string | null;
    returnTo?: string | null;
    launchContext?: PlatformLaunchPayload | null;
  } = {}
): string {
  const launchContext = options.launchContext ?? null;
  const target = resolveDeepLinkTarget(href, options.productHomeUrl ?? null, launchContext?.deepLink ?? null);
  return appendFederationParams(target, {
    returnTo: options.returnTo,
    entryPointId: launchContext?.entryPointId ?? null,
    platformRole: launchContext?.platformRole ?? null,
    projectId: launchContext?.projectId ?? null,
  });
}
