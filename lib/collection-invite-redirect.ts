/**
 * Collection invite redirect into CREATION editor.
 * Spec: collection-invite-links.md · creation editor-share-invite.md
 */

import { CREATION_LAUNCH_QUERY, buildCreationProjectLaunchUrl } from '@/lib/creation-launch-url';

export const CREATION_EDITOR_QUERY = {
  SCENE_ID: 'sceneId',
  PLATFORM_PROJECT_ID: CREATION_LAUNCH_QUERY.PLATFORM_PROJECT_ID,
} as const;

/**
 * Builds `{CREATION}/editor?sceneId=&platformProjectId=` when sceneId present,
 * else Collection projects launch URL.
 */
export function buildCreationInviteRedirectUrl(
  creationBaseTrimmed: string,
  opts: { platformProjectId: string; sceneId?: string | null }
): string {
  const base = creationBaseTrimmed.replace(/\/+$/, '');
  if (!base) return '';
  const sceneId = opts.sceneId?.trim();
  const platformProjectId = opts.platformProjectId.trim();
  if (!sceneId) {
    return buildCreationProjectLaunchUrl(base, { platformProjectId });
  }
  const params = new URLSearchParams();
  params.set(CREATION_EDITOR_QUERY.SCENE_ID, sceneId);
  if (platformProjectId) {
    params.set(CREATION_EDITOR_QUERY.PLATFORM_PROJECT_ID, platformProjectId);
  }
  return `${base}/editor?${params.toString()}`;
}

export function resolvePublicAppBaseUrl(): string {
  return (process.env.NEXTAUTH_URL || process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
}
