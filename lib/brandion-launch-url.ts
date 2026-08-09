/**
 * BRANDION Collection launch — aligned with brandion-v3
 * `apps/web/app/projects/page.tsx` (`?platformProjectId=`).
 * Do not use Checkion's `platformProjectHint`.
 */

export const BRANDION_LAUNCH_QUERY = {
  PLATFORM_PROJECT_ID: 'platformProjectId',
} as const;

/**
 * Builds `{BRANDION}/projects?platformProjectId=…` (omit query when unbound).
 * @param brandionBaseTrimmed — `getBrandionUrl().replace(/\/+$/, '')`
 */
export function buildBrandionProjectLaunchUrl(
  brandionBaseTrimmed: string,
  opts: { platformProjectId?: string | null }
): string {
  const base = brandionBaseTrimmed.replace(/\/+$/, '');
  if (!base) return '';
  const projects = `${base}/projects`;
  const id = opts.platformProjectId?.trim();
  if (!id) return projects;
  const params = new URLSearchParams();
  params.set(BRANDION_LAUNCH_QUERY.PLATFORM_PROJECT_ID, id);
  return `${projects}?${params.toString()}`;
}
