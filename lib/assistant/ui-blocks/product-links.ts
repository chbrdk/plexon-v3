import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { buildBrandionProjectLaunchUrl } from '@/lib/brandion-launch-url';
import {
  getAudionAdminUrl,
  getBrandionUrl,
  getCheckionUrl,
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
