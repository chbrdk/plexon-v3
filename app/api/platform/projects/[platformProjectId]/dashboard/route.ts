import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { getAudionAdminUrl, getCheckionUrl } from '@/lib/constants';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { platformProjectId } = await ctx.params;
  if (!platformProjectId?.trim()) {
    return apiError('Invalid project id', API_STATUS.BAD_REQUEST);
  }

  const allowed = await userCanViewPlatformProject(user.id, user.role, platformProjectId.trim());
  if (!allowed) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }

  const project = await getPlatformProjectById(platformProjectId.trim());
  if (!project) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const bindings = await getBindingsForPlatformProject(platformProjectId.trim());

  const [checkion, audion] = await Promise.all([
    fetchCheckionPlatformProjectSummary(platformProjectId.trim(), user.id),
    fetchAudionPlatformProjectSummary(platformProjectId.trim(), user.id),
  ]);

  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  const audionBase = getAudionAdminUrl().replace(/\/+$/, '');
  const ppid = platformProjectId.trim();
  const companyId = project.companyId;

  return Response.json({
    platformProject: project,
    bindings,
    checkion,
    audion,
    links: {
      checkionProject: checkion
        ? `${checkionBase}/?platformProjectHint=${encodeURIComponent(ppid)}`
        : checkionBase,
      audionProject: buildAudionAdminLaunchUrl(audionBase, {
        platformProjectHint: audion ? ppid : null,
        platformCompanyId: companyId,
      }),
    },
  });
}
