import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { buildBrandionProjectLaunchUrl } from '@/lib/brandion-launch-url';
import { getAudionAdminUrl, getBrandionUrl, getCheckionUrl } from '@/lib/constants';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import {
  resolveAudionCapability,
  resolveBrandionCapability,
  resolveCheckionCapability,
} from '@/lib/platform-project-capability-summary';
import {
  fetchAudionPlatformProjectSummary,
  fetchBrandionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
  type AudionProjectSummary,
  type BrandionProjectSummary,
  type CheckionProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';

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
  brandion: BrandionProjectSummary | null;
  links: { checkionProject: string; audionProject: string; brandionProject: string };
  /** Always true for v3 fresh-start insights (Collections only). */
  openPlatformProject: true;
};

/**
 * User-facing project list: **Collections only**.
 * plexon-v3 ships with a new database — no product-only / legacy standalone cards
 * (`specs/domain/collection-projects.md` — fresh start, no backfill).
 */
export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', API_STATUS.UNAVAILABLE);

  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  const audionBase = getAudionAdminUrl().replace(/\/+$/, '');
  const brandionBase = (getBrandionUrl() ?? '').replace(/\/+$/, '');

  const includeArchived = new URL(request.url).searchParams.get('includeArchived') === '1';
  const archivedOnly = includeArchived;
  let allPlatform = await listAccessiblePlatformProjectsForUser(user.id, { includeArchived });
  if (archivedOnly) {
    allPlatform = allPlatform.filter((p) => p.status === 'archived');
  }
  const totalAccessible = allPlatform.length;
  const truncated = totalAccessible > INSIGHTS_CAP;

  const buildLinks = (
    platformProjectId: string,
    platformCompanyId: string,
    checkion: CheckionProjectSummary | null,
    audion: AudionProjectSummary | null,
    brandion: BrandionProjectSummary | null
  ) => ({
    checkionProject: checkion
      ? `${checkionBase}/?platformProjectHint=${encodeURIComponent(platformProjectId)}`
      : checkionBase,
    audionProject: buildAudionAdminLaunchUrl(audionBase, {
      platformProjectHint: audion ? platformProjectId : null,
      platformCompanyId,
    }),
    brandionProject: brandion
      ? buildBrandionProjectLaunchUrl(brandionBase, { platformProjectId })
      : brandionBase
        ? `${brandionBase}/projects`
        : '',
  });

  const platformSlice = allPlatform.slice(0, INSIGHTS_CAP);
  const projects: PlatformMeProjectInsightRow[] = [];

  for (let i = 0; i < platformSlice.length; i += BATCH_SIZE) {
    const chunk = platformSlice.slice(i, i + BATCH_SIZE);
    const batch = await Promise.all(
      chunk.map(async (platformProject) => {
        const platformProjectId = platformProject.id;
        const [checkionLive, audionLive, brandionLive, bindings] = await Promise.all([
          fetchCheckionPlatformProjectSummary(platformProjectId, user.id),
          fetchAudionPlatformProjectSummary(platformProjectId, user.id),
          fetchBrandionPlatformProjectSummary(platformProjectId, user.id),
          getBindingsForPlatformProject(platformProjectId),
        ]);
        const checkion = resolveCheckionCapability(checkionLive, bindings);
        const audion = resolveAudionCapability(audionLive, bindings);
        const brandion = resolveBrandionCapability(brandionLive, bindings);
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
          links: buildLinks(
            platformProjectId,
            platformProject.companyId,
            checkion,
            audion,
            brandion
          ),
          openPlatformProject: true as const,
        };
      })
    );
    projects.push(...batch);
  }

  return Response.json({
    projects,
    truncated,
    totalAccessible,
    shown: projects.length,
  });
}
