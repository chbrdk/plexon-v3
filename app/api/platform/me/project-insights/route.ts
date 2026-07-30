import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { getAudionAdminUrl, getCheckionUrl } from '@/lib/constants';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import { buildStandaloneProductInsightRows } from '@/lib/platform-me-project-insights-standalone';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
  type AudionProjectSummary,
  type CheckionProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';
import {
  fetchAudionUserProjectsForInsights,
  fetchCheckionUserProjectsForInsights,
} from '@/lib/user-product-projects-for-insights';

const INSIGHTS_CAP = 30;
const BATCH_SIZE = 5;

export type PlatformMeProjectInsightRow = {
  platformProject: {
    id: string;
    name: string;
    domain: string | null;
    status: string;
    companyId: string;
  };
  checkion: CheckionProjectSummary | null;
  audion: AudionProjectSummary | null;
  links: { checkionProject: string; audionProject: string };
  /** When false, `platformProject.id` is not a PLEXON `/projects/:id` route (product-only card). */
  openPlatformProject: boolean;
};

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', API_STATUS.UNAVAILABLE);

  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  const audionBase = getAudionAdminUrl().replace(/\/+$/, '');

  const [allPlatform, checkionDb, audionDb] = await Promise.all([
    listAccessiblePlatformProjectsForUser(user.id),
    fetchCheckionUserProjectsForInsights(user.id),
    fetchAudionUserProjectsForInsights(user.id),
  ]);

  const accessibleIds = new Set(allPlatform.map((p) => p.id));
  const standalone = buildStandaloneProductInsightRows({
    checkionBase,
    audionBase,
    accessiblePlatformProjectIds: accessibleIds,
    checkionRows: checkionDb,
    audionRows: audionDb,
  });

  const totalAccessible = allPlatform.length + standalone.length;
  const truncated = totalAccessible > INSIGHTS_CAP;

  const buildLinks = (
    platformProjectId: string,
    platformCompanyId: string,
    checkion: CheckionProjectSummary | null,
    audion: AudionProjectSummary | null
  ) => ({
    checkionProject: checkion
      ? `${checkionBase}/?platformProjectHint=${encodeURIComponent(platformProjectId)}`
      : checkionBase,
    audionProject: buildAudionAdminLaunchUrl(audionBase, {
      platformProjectHint: audion ? platformProjectId : null,
      platformCompanyId,
    }),
  });

  const platformSlice = allPlatform.slice(0, INSIGHTS_CAP);
  const platformRows: PlatformMeProjectInsightRow[] = [];

  for (let i = 0; i < platformSlice.length; i += BATCH_SIZE) {
    const chunk = platformSlice.slice(i, i + BATCH_SIZE);
    const batch = await Promise.all(
      chunk.map(async (platformProject) => {
        const platformProjectId = platformProject.id;
        const [checkion, audion] = await Promise.all([
          fetchCheckionPlatformProjectSummary(platformProjectId, user.id),
          fetchAudionPlatformProjectSummary(platformProjectId, user.id),
        ]);
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
          links: buildLinks(platformProjectId, platformProject.companyId, checkion, audion),
          openPlatformProject: true as const,
        };
      })
    );
    platformRows.push(...batch);
  }

  const remaining = INSIGHTS_CAP - platformRows.length;
  const standaloneSlice = remaining > 0 ? standalone.slice(0, remaining) : [];

  const projects: PlatformMeProjectInsightRow[] = [
    ...platformRows,
    ...standaloneSlice.map((s) => ({
      platformProject: s.platformProject,
      checkion: s.checkion,
      audion: s.audion,
      links: s.links,
      openPlatformProject: s.openPlatformProject,
    })),
  ];

  return Response.json({
    projects,
    truncated,
    totalAccessible,
    shown: projects.length,
  });
}
