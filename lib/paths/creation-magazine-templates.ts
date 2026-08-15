/** Creation MagazineTemplate API path helpers — never hardcode FQDNs. */

import { getCreationServiceApiUrl } from '@/lib/constants';

/** Env: prefer Creation Mag template for EQC PDF (`0`/`false`/`off` = force legacy). */
export const ENV_EQC_CREATION_MAGAZINE_TEMPLATE = 'EQC_CREATION_MAGAZINE_TEMPLATE';

/** Consumer role matching Creation `paths.magazineTemplateRoleQuickCheck`. */
export const CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK = 'quick-check-magazine' as const;

/** Relative API paths on Creation (central). */
export const CREATION_API_MAGAZINE_TEMPLATES = '/api/magazine-templates';
export const creationApiMagazineTemplate = (templateId: string) =>
  `/api/magazine-templates/${encodeURIComponent(templateId)}`;
export const creationApiMagazineTemplateVersion = (templateId: string, version: number) =>
  `/api/magazine-templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(String(version))}`;
export const creationApiScenePdf = (sceneId: string) =>
  `/api/scenes/${encodeURIComponent(sceneId)}/pdf`;

function creationApiBase(): string | null {
  const base = getCreationServiceApiUrl()?.replace(/\/+$/, '');
  return base || null;
}

/** Absolute list/discover URL (null when Creation base unset). */
export function apiCreationMagazineTemplatesLatest(opts: {
  platformProjectId: string;
  role?: string;
}): string | null {
  const base = creationApiBase();
  if (!base) return null;
  const q = new URLSearchParams({
    platformProjectId: opts.platformProjectId,
    role: opts.role ?? CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK,
    latest: '1',
    status: 'published',
  });
  return `${base}${CREATION_API_MAGAZINE_TEMPLATES}?${q.toString()}`;
}

export function apiCreationScenePdf(sceneId: string): string | null {
  const base = creationApiBase();
  if (!base) return null;
  return `${base}${creationApiScenePdf(sceneId)}`;
}

/**
 * Prefer Creation template when env unset/truthy.
 * Explicit off: `0` / `false` / `off`.
 */
export function isEqcCreationMagazineTemplateEnabled(): boolean {
  const raw =
    (typeof process !== 'undefined' ? process.env[ENV_EQC_CREATION_MAGAZINE_TEMPLATE] : '') ?? '';
  const v = raw.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  return true;
}
