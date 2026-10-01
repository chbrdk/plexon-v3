/**
 * MAGCLOUD Collection launch — `apps/web/app/boards/page.tsx` (`?platformProjectId=`).
 */

export const MAGCLOUD_LAUNCH_QUERY = {
  PLATFORM_PROJECT_ID: 'platformProjectId',
} as const;

/**
 * Builds `{MAGCLOUD}/boards?platformProjectId=…` (omit query when unbound).
 * @param magcloudBaseTrimmed — `getMagcloudUrl().replace(/\/+$/, '')`
 */
export function buildMagcloudProjectLaunchUrl(
  magcloudBaseTrimmed: string,
  opts: { platformProjectId?: string | null }
): string {
  const base = magcloudBaseTrimmed.replace(/\/+$/, '');
  if (!base) return '';
  const boards = `${base}/boards`;
  const id = opts.platformProjectId?.trim();
  if (!id) return boards;
  const params = new URLSearchParams();
  params.set(MAGCLOUD_LAUNCH_QUERY.PLATFORM_PROJECT_ID, id);
  return `${boards}?${params.toString()}`;
}
