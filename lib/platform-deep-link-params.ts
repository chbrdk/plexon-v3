/**
 * Canonical Collection deep-link query params (Wave D).
 * Spec: specs/domain/collection-read-model.md
 *
 * Prefer `platformProjectId` everywhere. `platformProjectHint` is a legacy alias
 * still accepted by Checkion / Audion admin routes.
 */

export const PLATFORM_DEEP_LINK_QUERY = {
  /** Canonical Collection id query key for all products. */
  PLATFORM_PROJECT_ID: 'platformProjectId',
  /** Legacy alias — keep for Checkion / Audion admin until products drop it. */
  PLATFORM_PROJECT_HINT: 'platformProjectHint',
  PLATFORM_COMPANY_ID: 'platformCompanyId',
} as const;

/**
 * Appends canonical `platformProjectId` and optionally the legacy hint.
 */
export function appendPlatformProjectDeepLinkParams(
  params: URLSearchParams,
  opts: {
    platformProjectId?: string | null;
    /** When true (default), also set legacy `platformProjectHint` to the same id. */
    includeLegacyHint?: boolean;
    platformCompanyId?: string | null;
  }
): void {
  const id = opts.platformProjectId?.trim();
  if (id) {
    params.set(PLATFORM_DEEP_LINK_QUERY.PLATFORM_PROJECT_ID, id);
    if (opts.includeLegacyHint !== false) {
      params.set(PLATFORM_DEEP_LINK_QUERY.PLATFORM_PROJECT_HINT, id);
    }
  }
  const company = opts.platformCompanyId?.trim();
  if (company) {
    params.set(PLATFORM_DEEP_LINK_QUERY.PLATFORM_COMPANY_ID, company);
  }
}

/** Resolve Collection id from either canonical or legacy query key. */
export function resolvePlatformProjectIdFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): string | null {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() || null;
    }
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };
  return (
    get(PLATFORM_DEEP_LINK_QUERY.PLATFORM_PROJECT_ID) ||
    get(PLATFORM_DEEP_LINK_QUERY.PLATFORM_PROJECT_HINT) ||
    null
  );
}
