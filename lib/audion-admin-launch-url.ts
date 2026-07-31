/**
 * AUDION admin deep-link query keys — must stay aligned with
 * AUDION `apps/web/lib/platform-company-context.ts` (`platformCompanyId`).
 */
export const AUDION_LAUNCH_QUERY = {
  PLATFORM_PROJECT_HINT: 'platformProjectHint',
  PLATFORM_COMPANY_ID: 'platformCompanyId',
} as const;

/**
 * Builds `…/admin/?platformProjectHint=…&platformCompanyId=…` (omit empty parts).
 * @param adminBaseTrimmed — return value of `getAudionAdminUrl().replace(/\/+$/, '')`
 */
export function buildAudionAdminLaunchUrl(
  adminBaseTrimmed: string,
  opts: { platformProjectHint?: string | null; platformCompanyId?: string | null }
): string {
  const base = adminBaseTrimmed.replace(/\/+$/, '');
  const params = new URLSearchParams();
  const hint = opts.platformProjectHint?.trim();
  const company = opts.platformCompanyId?.trim();
  if (hint) params.set(AUDION_LAUNCH_QUERY.PLATFORM_PROJECT_HINT, hint);
  if (company) params.set(AUDION_LAUNCH_QUERY.PLATFORM_COMPANY_ID, company);
  const qs = params.toString();
  return qs ? `${base}/?${qs}` : `${base}/`;
}

/**
 * Builds an AUDION app deep-link on the web origin (not `/admin`).
 * Aligns with Audion `buildChatHref` for `/chat` query keys.
 */
export function buildAudionAppUrl(
  webOrigin: string,
  path: string,
  query?: Record<string, string | null | undefined>
): string {
  const origin = webOrigin.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      const trimmed = value?.trim();
      if (trimmed) params.set(key, trimmed);
    }
  }
  const qs = params.toString();
  return qs ? `${origin}${normalizedPath}?${qs}` : `${origin}${normalizedPath}`;
}

export function buildAudionTargetGroupUrl(webOrigin: string, targetGroupId: string): string {
  return buildAudionAppUrl(webOrigin, `/target-groups/${encodeURIComponent(targetGroupId)}`);
}

export function buildAudionPersonaUrl(webOrigin: string, personaId: string): string {
  return buildAudionAppUrl(webOrigin, `/personas/${encodeURIComponent(personaId)}`);
}

export function buildAudionChatUrl(
  webOrigin: string,
  opts: { personaId: string; projectId: string }
): string {
  return buildAudionAppUrl(webOrigin, '/chat', {
    personaId: opts.personaId,
    projectId: opts.projectId,
  });
}
