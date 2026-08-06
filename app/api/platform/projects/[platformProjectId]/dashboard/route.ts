import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getOrCreateKnowledgePack,
} from '@/lib/db/collection-knowledge-packs';
import {
  listCollectionTestFlows,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import {
  buildKnowledgeFacetReadiness,
  ensureFacetsShape,
} from '@/lib/collection-knowledge-pack';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';
import {
  resolveAudionCapability,
  resolveCheckionCapability,
} from '@/lib/platform-project-capability-summary';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';
import { getAudionAdminUrl, getCheckionUrl } from '@/lib/constants';
import { ensureFlowDocument } from '@/lib/collection-test-flow';

const FLOW_TEASER_LIMIT = 3;

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

  const ppid = platformProjectId.trim();
  const bindings = await getBindingsForPlatformProject(ppid);

  const [checkionLive, audionLive, packRow, flowRows] = await Promise.all([
    fetchCheckionPlatformProjectSummary(ppid, user.id),
    fetchAudionPlatformProjectSummary(ppid, user.id),
    getOrCreateKnowledgePack(ppid),
    listCollectionTestFlows(ppid),
  ]);
  const checkion = resolveCheckionCapability(checkionLive, bindings);
  const audion = resolveAudionCapability(audionLive, bindings);

  const facets = ensureFacetsShape(packRow.facets, packRow.updatedAt.toISOString());
  const knowledge = {
    revision: packRow.revision,
    facets: buildKnowledgeFacetReadiness(facets),
  };

  const flows = {
    count: flowRows.length,
    recent: flowRows.slice(0, FLOW_TEASER_LIMIT).map((row) => {
      const res = toCollectionTestFlowResponse(row);
      const doc = ensureFlowDocument(row.flow);
      return {
        id: res.id,
        name: res.name,
        updatedAt: res.updatedAt,
        lastRunStatus: doc.lastRun?.status ?? doc.lastVerdict?.status ?? null,
      };
    }),
  };

  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  const audionBase = getAudionAdminUrl().replace(/\/+$/, '');
  const companyId = project.companyId;

  return Response.json({
    platformProject: project,
    bindings,
    checkion,
    audion,
    knowledge,
    flows,
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
