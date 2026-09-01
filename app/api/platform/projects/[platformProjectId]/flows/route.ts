import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  authorizeKnowledgeRead,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
  COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
  COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
  createEqcQualityTemplate,
  createJourneyQualityIssuesTemplate,
  createJourneyQualityTemplate,
  createPageQualityIssuesTemplate,
  createPageQualityTemplate,
  createVaillantBarrierResearchTemplate,
  createVaillantInstallerDualPerspectiveTemplate,
} from '@/lib/collection-test-flow';
import { resolveEventQuickCheckProfile } from '@/lib/paths/assistant-workflows';
import {
  createCollectionTestFlow,
  listCollectionTestFlows,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { platformJson } from '@/lib/platform-contract';

function authError(code: 'unauthorized' | 'forbidden' | 'contract'): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN);
}

function resolveCreateUrl(
  body: Record<string, unknown> | null,
  domain: string | null | undefined
): string {
  if (typeof body?.url === 'string' && body.url.trim()) return body.url.trim();
  const d = domain?.trim();
  if (!d) return '';
  return d.startsWith('http') ? d : `https://${d}`;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    const { platformProjectId } = await ctx.params;
    const id = platformProjectId?.trim();
    if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

    const auth = await authorizeKnowledgeRead(request, id);
    if ('error' in auth) return authError(auth.error);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    const rows = await listCollectionTestFlows(id);
    return platformJson({
      items: rows.map(toCollectionTestFlowResponse),
    });
  } catch (e) {
    return handleApiError(e, { context: 'collection flows GET' });
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { platformProjectId } = await ctx.params;
    const id = platformProjectId?.trim();
    if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

    const project = await getPlatformProjectById(id);
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

    if (!(await userCanEditKnowledgePack(user, id))) {
      return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const rawTemplate =
      typeof body?.templateId === 'string' ? body.templateId.trim() : COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY;
    const knownTemplates = new Set([
      COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
      COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
      COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
      COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
      COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
      COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
      COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
    ]);
    const templateId = knownTemplates.has(rawTemplate)
      ? rawTemplate
      : COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY;
    const defaultName =
      templateId === COLLECTION_FLOW_TEMPLATE_EQC_QUALITY
        ? 'Event Quick Check'
        : templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH
          ? 'Vaillant Group · Barrier Research (UC1)'
          : templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL
            ? 'Vaillant Group · Installer Dual Perspective (UC2)'
            : templateId === COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES
            ? 'Journey + quality + issues'
            : templateId === COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES
              ? 'Page quality + issues'
              : templateId === COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY
                ? 'Journey + quality'
                : 'Page quality';
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : defaultName;
    const url = resolveCreateUrl(body, project.domain);
    const depth = body?.depth === 'complete' ? 'complete' : 'quick';
    const eqcProfile = resolveEventQuickCheckProfile(depth);

    const flow =
      templateId === COLLECTION_FLOW_TEMPLATE_EQC_QUALITY
        ? createEqcQualityTemplate(url, {
            maxPages: eqcProfile.scanMaxPages,
            includeCompetitors: eqcProfile.scanCompetitors,
          })
        : templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH
          ? createVaillantBarrierResearchTemplate({ journeyUrl: url, scanUrl: url })
          : templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL
            ? createVaillantInstallerDualPerspectiveTemplate({
                customerUrl: url,
                scanUrl: url,
              })
            : templateId === COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES
            ? createJourneyQualityIssuesTemplate(url)
            : templateId === COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES
              ? createPageQualityIssuesTemplate(url)
              : templateId === COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY
                ? createJourneyQualityTemplate(url)
                : createPageQualityTemplate(url);

    const row = await createCollectionTestFlow({
      platformProjectId: id,
      name,
      flow,
      templateId,
      ownerId: user.id,
    });

    return platformJson(toCollectionTestFlowResponse(row), { status: 201 });
  } catch (e) {
    return handleApiError(e, { context: 'collection flows POST' });
  }
}
