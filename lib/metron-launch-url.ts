/**
 * METRON Collection launch — aligned with metron-v3
 * `apps/web/app/projects/page.tsx` (`?platformProjectId=`).
 * Do not use Checkion's `platformProjectHint`.
 */

export const METRON_LAUNCH_QUERY = {
  PLATFORM_PROJECT_ID: 'platformProjectId',
} as const;

/**
 * Builds `{METRON}/projects?platformProjectId=…` (omit query when unbound).
 * @param metronBaseTrimmed — `getMetronUrl().replace(/\/+$/, '')`
 */
export function buildMetronProjectLaunchUrl(
  metronBaseTrimmed: string,
  opts: { platformProjectId?: string | null }
): string {
  const base = metronBaseTrimmed.replace(/\/+$/, '');
  if (!base) return '';
  const projects = `${base}/projects`;
  const id = opts.platformProjectId?.trim();
  if (!id) return projects;
  const params = new URLSearchParams();
  params.set(METRON_LAUNCH_QUERY.PLATFORM_PROJECT_ID, id);
  return `${projects}?${params.toString()}`;
}
