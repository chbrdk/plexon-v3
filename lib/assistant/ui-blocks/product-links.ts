import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { buildBrandionProjectLaunchUrl } from '@/lib/brandion-launch-url';
import {
  getAudionAdminUrl,
  getBrandionUrl,
  getCheckionUrl,
  getVideonUrl,
  pathPlatformProjectDashboard,
} from '@/lib/constants';
import { pathAudionAdminProject } from '@/lib/paths/audion-api';
import { pathBrandionProject } from '@/lib/paths/brandion-api';
import { pathCheckionProject, pathCheckionScanResult } from '@/lib/paths/checkion-api';

export type ProductLink = {
  label: string;
  href: string;
  external?: boolean;
};

/** Absolute VIDEON media/editor URL from a relative MCP href or path. */
export function buildVideonMediaHref(relativeOrAbsolute: string): string | null {
  const raw = relativeOrAbsolute.trim();
  if (!raw) return null;
  if (/^https:\/\//i.test(raw)) return raw;
  const base = getVideonUrl()?.replace(/\/+$/, '') ?? '';
  if (!base) return null;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${base}${path}`;
}

/** Same-origin poster proxy for assistant video hit cards. */
export function buildVideonFramePosterUrl(input: {
  mediaAssetId: string;
  platformProjectId: string;
  tMs?: number | null;
}): string {
  const params = new URLSearchParams({
    mediaAssetId: input.mediaAssetId,
    platformProjectId: input.platformProjectId,
  });
  if (input.tMs != null && Number.isFinite(input.tMs) && input.tMs >= 0) {
    params.set('t', String(Math.floor(input.tMs)));
  }
  return `/api/assistant/videon-frame?${params.toString()}`;
}

/** Same-origin muted preview proxy for assistant video hit cards. */
export function buildVideonPreviewUrl(input: {
  mediaAssetId: string;
  platformProjectId: string;
  tMs?: number | null;
  durationMs?: number | null;
}): string {
  const params = new URLSearchParams({
    mediaAssetId: input.mediaAssetId,
    platformProjectId: input.platformProjectId,
  });
  if (input.tMs != null && Number.isFinite(input.tMs) && input.tMs >= 0) {
    params.set('t', String(Math.floor(input.tMs)));
  }
  if (input.durationMs != null && Number.isFinite(input.durationMs) && input.durationMs > 0) {
    params.set('durationMs', String(Math.floor(input.durationMs)));
  }
  return `/api/assistant/videon-preview?${params.toString()}`;
}

export function buildCheckionProjectLink(
  platformProjectId: string,
  label = 'CHECKION öffnen'
): ProductLink {
  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  return {
    label,
    href: `${checkionBase}/?platformProjectHint=${encodeURIComponent(platformProjectId)}`,
    external: true,
  };
}

export function buildAudionProjectLink(
  platformProjectId: string,
  platformCompanyId: string,
  label = 'AUDION öffnen'
): ProductLink {
  const audionBase = getAudionAdminUrl().replace(/\/+$/, '');
  return {
    label,
    href: buildAudionAdminLaunchUrl(audionBase, {
      platformProjectHint: platformProjectId,
      platformCompanyId,
    }),
    external: true,
  };
}

export function buildBrandionProjectLink(
  platformProjectId: string,
  label = 'BRANDION öffnen'
): ProductLink {
  const brandionBase = (getBrandionUrl() ?? '').replace(/\/+$/, '');
  return {
    label,
    href: buildBrandionProjectLaunchUrl(brandionBase, { platformProjectId }),
    external: true,
  };
}

export function buildPlatformDashboardLink(
  platformProjectId: string,
  label = 'PLEXON Dashboard'
): ProductLink {
  return {
    label,
    href: pathPlatformProjectDashboard(platformProjectId),
  };
}

export function buildCheckionDirectProjectLink(
  projectId: string,
  label = 'In CHECKION öffnen'
): ProductLink {
  return {
    label,
    href: pathCheckionProject(projectId),
    external: true,
  };
}

export function buildAudionDirectProjectLink(
  projectId: string,
  label = 'In AUDION öffnen'
): ProductLink {
  return {
    label,
    href: pathAudionAdminProject(projectId),
    external: true,
  };
}

export function buildBrandionDirectProjectLink(
  projectId: string,
  label = 'In BRANDION öffnen'
): ProductLink {
  return {
    label,
    href: pathBrandionProject(projectId),
    external: true,
  };
}

export function buildCheckionScanLink(scanId: string, label = 'Scan in CHECKION öffnen'): ProductLink {
  return {
    label,
    href: pathCheckionScanResult(scanId),
    external: true,
  };
}

export type ProductCreatedTarget = 'audion' | 'checkion';

export function buildProductCreatedLinks(input: {
  product: ProductCreatedTarget;
  projectId: string;
}): ProductLink[] {
  if (input.product === 'audion') {
    return [buildAudionDirectProjectLink(input.projectId)];
  }
  return [buildCheckionDirectProjectLink(input.projectId)];
}

export function buildProjectSummaryLinks(input: {
  platformProjectId: string;
  platformCompanyId?: string;
  hasCheckion?: boolean;
  hasAudion?: boolean;
  hasBrandion?: boolean;
}): ProductLink[] {
  const links: ProductLink[] = [];
  if (input.hasCheckion) {
    links.push(buildCheckionProjectLink(input.platformProjectId));
  }
  if (input.hasAudion && input.platformCompanyId) {
    links.push(buildAudionProjectLink(input.platformProjectId, input.platformCompanyId));
  }
  if (input.hasBrandion) {
    links.push(buildBrandionProjectLink(input.platformProjectId));
  }
  links.push(buildPlatformDashboardLink(input.platformProjectId));
  return links;
}
