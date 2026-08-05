import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  authorizeKnowledgeRead,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
  createPageQualityTemplate,
} from '@/lib/collection-test-flow';
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
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : 'Page quality';
    const url =
      typeof body?.url === 'string' && body.url.trim()
        ? body.url.trim()
        : project.domain?.trim()
          ? project.domain.startsWith('http')
            ? project.domain.trim()
            : `https://${project.domain.trim()}`
          : '';

    const flow = createPageQualityTemplate(url);
    const row = await createCollectionTestFlow({
      platformProjectId: id,
      name,
      flow,
      templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
      ownerId: user.id,
    });

    return platformJson(toCollectionTestFlowResponse(row), { status: 201 });
  } catch (e) {
    return handleApiError(e, { context: 'collection flows POST' });
  }
}
