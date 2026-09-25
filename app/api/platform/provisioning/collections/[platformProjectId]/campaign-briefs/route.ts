import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import {
  createCampaignBrief,
  getCampaignBrief,
  isCampaignBriefStatus,
  listCampaignBriefs,
  patchCampaignBrief,
} from '@/lib/collection-campaign-brief'
import { recordSuiteAuditEvent } from '@/lib/suite-audit'
import { userCanManageCollectionLifecycle, userCanViewPlatformProject } from '@/lib/platform-project-access'

/**
 * Enterprise E7 CampaignBrief list + create.
 * Spec: suite-enterprise-program.md § E7
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { platformProjectId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST)

  const canView = await userCanViewPlatformProject(user.id, user.role, id)
  if (!canView) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const items = await listCampaignBriefs(id)
  return Response.json({ items })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { platformProjectId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST)

  const canManage = await userCanManageCollectionLifecycle(user, id)
  if (!canManage) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    status?: string
    marketRef?: string | null
    personaRefs?: string[]
    guidelineId?: string | null
    pageRefs?: string[]
    sceneId?: string | null
    mediaRefs?: string[]
    kpiRefs?: string[]
    spirionRefs?: string[]
  }

  if (!body.title?.trim()) return apiError('title_required', API_STATUS.BAD_REQUEST)
  if (body.status && !isCampaignBriefStatus(body.status)) {
    return apiError('status_invalid', API_STATUS.BAD_REQUEST)
  }

  const brief = await createCampaignBrief({
    platformProjectId: id,
    title: body.title,
    createdByUserId: user.id,
    status: body.status && isCampaignBriefStatus(body.status) ? body.status : 'draft',
    marketRef: body.marketRef,
    personaRefs: body.personaRefs,
    guidelineId: body.guidelineId,
    pageRefs: body.pageRefs,
    sceneId: body.sceneId,
    mediaRefs: body.mediaRefs,
    kpiRefs: body.kpiRefs,
    spirionRefs: body.spirionRefs,
  })

  await recordSuiteAuditEvent({
    actorUserId: user.id,
    platformProjectId: id,
    productId: 'plexon',
    action: 'published',
    subjectRef: brief.id,
    meta: { kind: 'campaign_brief' },
  })

  return Response.json({ brief }, { status: 201 })
}

/** PATCH via query ?briefId= for simplicity when nested route not yet used. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { platformProjectId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST)

  const canManage = await userCanManageCollectionLifecycle(user, id)
  if (!canManage) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const url = new URL(request.url)
  const briefId = url.searchParams.get('briefId')?.trim()
  if (!briefId) return apiError('briefId_required', API_STATUS.BAD_REQUEST)

  const existing = await getCampaignBrief(id, briefId)
  if (!existing) return apiError('Not found', API_STATUS.NOT_FOUND)

  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    status?: string
    marketRef?: string | null
    personaRefs?: string[]
    guidelineId?: string | null
    pageRefs?: string[]
    sceneId?: string | null
    mediaRefs?: string[]
    kpiRefs?: string[]
    spirionRefs?: string[]
  }

  if (body.status && !isCampaignBriefStatus(body.status)) {
    return apiError('status_invalid', API_STATUS.BAD_REQUEST)
  }

  const brief = await patchCampaignBrief({
    platformProjectId: id,
    briefId,
    title: body.title,
    status: body.status && isCampaignBriefStatus(body.status) ? body.status : undefined,
    marketRef: body.marketRef,
    personaRefs: body.personaRefs,
    guidelineId: body.guidelineId,
    pageRefs: body.pageRefs,
    sceneId: body.sceneId,
    mediaRefs: body.mediaRefs,
    kpiRefs: body.kpiRefs,
    spirionRefs: body.spirionRefs,
  })
  if (!brief) return apiError('Not found', API_STATUS.NOT_FOUND)
  return Response.json({ brief })
}
