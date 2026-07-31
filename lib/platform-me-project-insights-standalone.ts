import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';

import type { AudionUserProjectInsightRow, CheckionUserProjectInsightRow } from '@/lib/user-product-projects-for-insights';

/** Synthetic `platform_projects.id` for cards that are not backed by a PLEXON platform row. */
export const PLEXON_INSIGHT_SYNTHETIC_PLATFORM_ID_PREFIX = 'plexon-insight-synthetic:';

export function isSyntheticInsightPlatformProjectId(id: string): boolean {
  return id.startsWith(PLEXON_INSIGHT_SYNTHETIC_PLATFORM_ID_PREFIX);
}

export type StandaloneProjectInsightRow = {
  platformProject: {
    id: string;
    name: string;
    domain: string | null;
    status: string;
    companyId: string;
  };
  checkion: { externalProjectId: string; scanCount: number } | null;
  audion: { externalProjectId: string; personaCount: number } | null;
  links: { checkionProject: string; audionProject: string };
  openPlatformProject: false;
};

function trimUrl(base: string): string {
  return base.replace(/\/+$/, '');
}

/**
 * Product-only insight cards (legacy, 2C): CHECKION/AUDION rows from product DBs that are not
 * already represented by an accessible Collection (`platform_projects`). Shown as “not linked yet”
 * — not a second project type. See `specs/domain/collection-projects.md`.
 */
export function buildStandaloneProductInsightRows(input: {
  checkionBase: string;
  audionBase: string;
  accessiblePlatformProjectIds: Set<string>;
  checkionRows: CheckionUserProjectInsightRow[];
  audionRows: AudionUserProjectInsightRow[];
}): StandaloneProjectInsightRow[] {
  const checkionBase = trimUrl(input.checkionBase);
  const audionBase = trimUrl(input.audionBase);
  const accessible = input.accessiblePlatformProjectIds;
  const out: StandaloneProjectInsightRow[] = [];

  for (const row of input.checkionRows) {
    const pp = row.platformProjectId?.trim();
    if (pp && accessible.has(pp)) continue;
    const chk = `${checkionBase}/projects/${encodeURIComponent(row.id)}`;
    const aud = buildAudionAdminLaunchUrl(audionBase, {
      platformProjectHint: pp ?? null,
      platformCompanyId: row.platformCompanyId?.trim() || null,
    });
    out.push({
      platformProject: {
        id: `${PLEXON_INSIGHT_SYNTHETIC_PLATFORM_ID_PREFIX}checkion:${row.id}`,
        name: row.name,
        domain: row.domain,
        status: 'active',
        companyId: row.platformCompanyId?.trim() ?? '',
      },
      checkion: { externalProjectId: row.id, scanCount: row.scanCount },
      audion: null,
      links: { checkionProject: chk, audionProject: aud },
      openPlatformProject: false,
    });
  }

  for (const row of input.audionRows) {
    const pp = row.platformProjectId?.trim();
    if (pp && accessible.has(pp)) continue;
    const aud = `${audionBase}/projects/${encodeURIComponent(row.id)}`;
    const chkId = row.checkionProjectId?.trim();
    const chk = chkId ? `${checkionBase}/projects/${encodeURIComponent(chkId)}` : checkionBase;
    out.push({
      platformProject: {
        id: `${PLEXON_INSIGHT_SYNTHETIC_PLATFORM_ID_PREFIX}audion:${row.id}`,
        name: row.name,
        domain: null,
        status: 'active',
        companyId: row.platformCompanyId?.trim() ?? '',
      },
      checkion: null,
      audion: { externalProjectId: row.id, personaCount: row.personaCount },
      links: { checkionProject: chk, audionProject: aud },
      openPlatformProject: false,
    });
  }

  return out.sort((a, b) =>
    a.platformProject.name.localeCompare(b.platformProject.name, undefined, { sensitivity: 'base' })
  );
}
