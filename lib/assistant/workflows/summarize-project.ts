import type { RequestUser } from '@/lib/auth-request-user';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';
import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { getAudionAdminUrl, getCheckionUrl, pathPlatformProjectDashboard } from '@/lib/constants';

export type ProjectSummaryResult = {
  ok: boolean;
  error?: string;
  text?: string;
  data?: Record<string, unknown>;
};

export async function summarizeProjectWorkflow(
  user: RequestUser,
  platformProjectId: string
): Promise<ProjectSummaryResult> {
  const allowed = await userCanViewPlatformProject(user.id, user.role, platformProjectId);
  if (!allowed) {
    return { ok: false, error: 'Kein Zugriff auf dieses Projekt' };
  }

  const project = await getPlatformProjectById(platformProjectId);
  if (!project) {
    return { ok: false, error: 'Projekt nicht gefunden' };
  }

  const bindings = await getBindingsForPlatformProject(platformProjectId);
  const [checkion, audion] = await Promise.all([
    fetchCheckionPlatformProjectSummary(platformProjectId, user.id),
    fetchAudionPlatformProjectSummary(platformProjectId, user.id),
  ]);

  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  const audionBase = getAudionAdminUrl().replace(/\/+$/, '');

  const lines = [
    `## ${project.name}`,
    '',
    project.domain ? `**Domain:** ${project.domain}` : null,
    `**Status:** ${project.status}`,
    '',
    '### CHECKION',
    checkion
      ? `- **Scans:** ${checkion.scanCount}\n- [In CHECKION öffnen](${checkionBase}/?platformProjectHint=${encodeURIComponent(platformProjectId)})`
      : '- _Nicht synchronisiert_',
    '',
    '### AUDION',
    audion
      ? `- **Personas:** ${audion.personaCount}\n- [In AUDION öffnen](${buildAudionAdminLaunchUrl(audionBase, {
          platformProjectHint: platformProjectId,
          platformCompanyId: project.companyId,
        })})`
      : '- _Nicht synchronisiert_',
    '',
    `[PLEXON Dashboard öffnen](${pathPlatformProjectDashboard(platformProjectId)})`,
  ].filter(Boolean);

  return {
    ok: true,
    text: lines.join('\n'),
    data: {
      platformProject: project,
      bindings,
      checkion,
      audion,
    },
  };
}
