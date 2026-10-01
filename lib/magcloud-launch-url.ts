/**
 * MAGCLOUD Collection launch — Collection workspace (`/projects/{id}`).
 * Spec: specs/domain/magcloud-capability.md · magcloud/specs/domain/boards.md
 */

export const MAGCLOUD_LAUNCH_QUERY = {
  PLATFORM_PROJECT_ID: 'platformProjectId',
} as const;

/**
 * Builds `{MAGCLOUD}/projects/{platformProjectId}` (fallback `/projects` when unbound).
 * @param magcloudBaseTrimmed — `getMagcloudUrl().replace(/\/+$/, '')`
 */
export function buildMagcloudProjectLaunchUrl(
  magcloudBaseTrimmed: string,
  opts: { platformProjectId?: string | null }
): string {
  const base = magcloudBaseTrimmed.replace(/\/+$/, '');
  if (!base) return '';
  const id = opts.platformProjectId?.trim();
  if (!id) return `${base}/projects`;
  return `${base}/projects/${encodeURIComponent(id)}`;
}
