import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler'
import {
  authorizeKnowledgeRead,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth'
import { getRequestUser } from '@/lib/auth-request-user'
import { distillFlowReportToKnowledgePack } from '@/lib/collection-flow-distill-report'
import { generateFlowReport } from '@/lib/collection-flow-generate-report'
import { listFlowReportPins } from '@/lib/db/collection-flow-report-pins'
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows'
import { getPlatformProjectById } from '@/lib/db/platform-projects'
import { platformJson } from '@/lib/platform-contract'
import { runtimeEnv } from '@/lib/runtime-env'

function authError(code: 'unauthorized' | 'forbidden' | 'contract'): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST)
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN)
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> },
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
    const user = await getRequestUser(request)
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

    const apiKey = runtimeEnv('ANTHROPIC_API_KEY')
    if (!apiKey) return apiError('ANTHROPIC_API_KEY not configured', 503)

    const { platformProjectId, flowId } = await ctx.params
    const id = platformProjectId?.trim()
    const fid = flowId?.trim()
    if (!id || !fid) return apiError('Invalid id', API_STATUS.BAD_REQUEST)

    const auth = await authorizeKnowledgeRead(request, id)
    if ('error' in auth) return authError(auth.error)
    if (!(await userCanEditKnowledgePack(user, id))) {
      return apiError('Forbidden', API_STATUS.FORBIDDEN)
    }

    const project = await getPlatformProjectById(id)
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND)
    const flow = await getCollectionTestFlow(id, fid)
    if (!flow) return apiError('Not found', API_STATUS.NOT_FOUND)

    let body: { title?: unknown; pinIds?: unknown; publishToCollection?: unknown }
    try {
      body = (await request.json().catch(() => ({}))) as typeof body
    } catch {
      body = {}
    }

    const publishToCollection = body.publishToCollection === false ? false : true
    const titleHint = typeof body.title === 'string' ? body.title.trim() : undefined
    const pinIds = Array.isArray(body.pinIds)
      ? body.pinIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : null

    let pins = await listFlowReportPins({ flowId: fid, userId: user.id })
    if (pinIds && pinIds.length > 0) {
      const idSet = new Set(pinIds)
      pins = pins.filter((p) => idSet.has(p.id))
    }
    if (pins.length === 0) {
      return apiError('No pinned outputs to generate report', API_STATUS.BAD_REQUEST)
    }

    const result = await generateFlowReport({
      platformProjectId: id,
      flowId: fid,
      flowName: flow.name,
      userId: user.id,
      pins,
      titleHint,
      anthropicApiKey: apiKey,
    })

    const origin = new URL(request.url).origin
    const shareUrl = `${origin}${result.sharePath}`

    let knowledgePackPublished = false
    let knowledgePackError: string | null = null
    if (publishToCollection) {
      const distill = await distillFlowReportToKnowledgePack({
        platformProjectId: id,
        flowId: fid,
        reportId: result.reportId,
        narrative: result.narrative,
        sharePath: result.sharePath,
        updatedByUserId: user.id,
      })
      knowledgePackPublished = distill.ok
      if (!distill.ok) knowledgePackError = distill.error
    }

    return platformJson({
      reportId: result.reportId,
      title: result.title,
      narrative: result.narrative,
      sharePath: result.sharePath,
      shareUrl,
      shareToken: result.shareToken,
      conversationId: result.conversationId,
      knowledgePackPublished,
      knowledgePackError,
    })
  } catch (e) {
    return handleApiError(e, { context: 'flow report generate POST' })
  }
}
