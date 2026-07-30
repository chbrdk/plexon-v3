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
