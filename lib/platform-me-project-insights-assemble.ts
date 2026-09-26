/**
 * Assemble light Collection hub rows without per-project HTTP summaries.
 * Spec: specs/domain/collection-projects.md — insights list Collections only.
 */
import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { buildBrandionProjectLaunchUrl } from '@/lib/brandion-launch-url';
import type {
  AudionUserProjectInsightRow,
  CheckionUserProjectInsightRow,
} from '@/lib/user-product-projects-for-insights';

export type InsightBindingLike = {
  platformProjectId: string;
  productId: string;
  externalProjectId: string | null;
};

export type InsightPlatformProjectLike = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  companyId: string;
};

export type AssembledProjectInsightRow = {
  platformProject: {
    id: string;
    name: string;
    domain: string | null;
    status: string;
    companyId: string;
  };
  checkion: { externalProjectId: string; scanCount: number } | null;
  audion: {
    externalProjectId: string;
    personaCount: number;
    targetGroupCount: number;
  } | null;
  brandion: { externalProjectId: string; analysisCount: number; guidelineCount: number } | null;
  links: { checkionProject: string; audionProject: string; brandionProject: string };
  openPlatformProject: true;
};

function bindingExternal(
  bindingsByProject: Map<string, InsightBindingLike[]>,
  platformProjectId: string,
  productId: string
): string | null {
  const rows = bindingsByProject.get(platformProjectId) ?? [];
  const id = rows.find((b) => b.productId === productId)?.externalProjectId?.trim();
  return id || null;
}

/**
 * Join Plexon Collections + batch bindings + optional product DB metric maps.
 * Prefer metric maps by `platformProjectId`; fall back to binding external id with count 0.
 */
export function assembleCollectionInsightRows(input: {
  platformProjects: InsightPlatformProjectLike[];
  bindings: InsightBindingLike[];
  checkionRows: CheckionUserProjectInsightRow[];
  audionRows: AudionUserProjectInsightRow[];
  checkionBase: string;
  audionBase: string;
  brandionBase: string;
}): AssembledProjectInsightRow[] {
  const checkionBase = input.checkionBase.replace(/\/+$/, '');
  const audionBase = input.audionBase.replace(/\/+$/, '');
  const brandionBase = input.brandionBase.replace(/\/+$/, '');

  const bindingsByProject = new Map<string, InsightBindingLike[]>();
  for (const b of input.bindings) {
    const list = bindingsByProject.get(b.platformProjectId) ?? [];
    list.push(b);
    bindingsByProject.set(b.platformProjectId, list);
  }

  const checkionByPp = new Map<string, CheckionUserProjectInsightRow>();
  for (const row of input.checkionRows) {
    const pp = row.platformProjectId?.trim();
    if (pp) checkionByPp.set(pp, row);
  }
  const audionByPp = new Map<string, AudionUserProjectInsightRow>();
  for (const row of input.audionRows) {
    const pp = row.platformProjectId?.trim();
    if (pp) audionByPp.set(pp, row);
  }

  return input.platformProjects.map((platformProject) => {
    const pid = platformProject.id;
    const chkMetric = checkionByPp.get(pid);
    const audMetric = audionByPp.get(pid);
    const chkBindingId = bindingExternal(bindingsByProject, pid, 'checkion');
    const audBindingId = bindingExternal(bindingsByProject, pid, 'audion');
    const brBindingId = bindingExternal(bindingsByProject, pid, 'brandion');

    const checkion =
      chkMetric != null
        ? { externalProjectId: chkMetric.id, scanCount: chkMetric.scanCount }
        : chkBindingId
          ? { externalProjectId: chkBindingId, scanCount: 0 }
          : null;

    const audion =
      audMetric != null
        ? {
            externalProjectId: audMetric.id,
            personaCount: audMetric.personaCount,
            targetGroupCount: audMetric.targetGroupCount,
          }
        : audBindingId
          ? { externalProjectId: audBindingId, personaCount: 0, targetGroupCount: 0 }
          : null;

    const brandion = brBindingId
      ? { externalProjectId: brBindingId, analysisCount: 0, guidelineCount: 0 }
      : null;

    return {
      platformProject: {
        id: platformProject.id,
        name: platformProject.name,
        domain: platformProject.domain,
        status: platformProject.status,
        companyId: platformProject.companyId,
      },
      checkion,
      audion,
      brandion,
      links: {
        checkionProject: checkion
          ? `${checkionBase}/?platformProjectHint=${encodeURIComponent(pid)}`
          : checkionBase,
        audionProject: buildAudionAdminLaunchUrl(audionBase, {
          platformProjectHint: audion ? pid : null,
          platformCompanyId: platformProject.companyId,
        }),
        brandionProject: brandion
          ? buildBrandionProjectLaunchUrl(brandionBase, { platformProjectId: pid })
          : brandionBase
            ? `${brandionBase}/projects`
            : '',
      },
      openPlatformProject: true as const,
    };
  });
}
