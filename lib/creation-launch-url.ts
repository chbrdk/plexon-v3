/**
 * CREATION Collection launch — aligned with creation-v3
 * `apps/web/app/projects/page.tsx` (`?platformProjectId=`).
 * Do not use Checkion's `platformProjectHint`.
 */

export const CREATION_LAUNCH_QUERY = {
  PLATFORM_PROJECT_ID: 'platformProjectId',
} as const;

/**
 * Builds `{CREATION}/projects?platformProjectId=…` (omit query when unbound).
 * @param creationBaseTrimmed — `getCreationUrl().replace(/\/+$/, '')`
 */
export function buildCreationProjectLaunchUrl(
  creationBaseTrimmed: string,
  opts: { platformProjectId?: string | null }
): string {
  const base = creationBaseTrimmed.replace(/\/+$/, '');
  if (!base) return '';
  const projects = `${base}/projects`;
  const id = opts.platformProjectId?.trim();
  if (!id) return projects;
  const params = new URLSearchParams();
  params.set(CREATION_LAUNCH_QUERY.PLATFORM_PROJECT_ID, id);
  return `${projects}?${params.toString()}`;
}
