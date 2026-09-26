import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getAudionAdminUrl, getBrandionUrl, getCheckionUrl } from '@/lib/constants';
import { getBindingsForPlatformProjects } from '@/lib/db/platform-project-bindings';
import { assembleCollectionInsightRows } from '@/lib/platform-me-project-insights-assemble';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import {
  fetchAudionUserProjectsForInsights,
  fetchCheckionUserProjectsForInsights,
} from '@/lib/user-product-projects-for-insights';

const INSIGHTS_CAP = 30;

export type PlatformMeProjectInsightRow = ReturnType<typeof assembleCollectionInsightRows>[number];

/**
 * User-facing project list: **Collections only**, light payload.
 *
 * Avoids N× product HTTP summaries (was ~4 round-trips per Collection).
 * Uses: 1× Plexon list + 1× bindings batch + 2× product DB metric queries.
 * Spec: `specs/domain/collection-projects.md` · Knowledge: hub metrics are counts, not catalogs.
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
  const platformSlice = allPlatform.slice(0, INSIGHTS_CAP);
  if (platformSlice.length === 0) {
    return Response.json({
      projects: [],
      truncated: false,
      totalAccessible: 0,
      shown: 0,
    });
  }
  const platformIds = platformSlice.map((p) => p.id);

  const [bindings, checkionRows, audionRows] = await Promise.all([
    getBindingsForPlatformProjects(platformIds),
    fetchCheckionUserProjectsForInsights(user.id),
    fetchAudionUserProjectsForInsights(user.id),
  ]);

  const projects = assembleCollectionInsightRows({
    platformProjects: platformSlice.map((p) => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      status: p.status,
      companyId: p.companyId,
    })),
    bindings: bindings.map((b) => ({
      platformProjectId: b.platformProjectId,
      productId: b.productId,
      externalProjectId: b.externalProjectId,
    })),
    checkionRows,
    audionRows,
    checkionBase,
    audionBase,
    brandionBase,
  });

  return Response.json({
    projects,
    truncated,
    totalAccessible,
    shown: projects.length,
  });
}
