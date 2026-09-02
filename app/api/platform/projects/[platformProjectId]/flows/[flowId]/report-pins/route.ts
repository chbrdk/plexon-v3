import { randomUUID } from 'crypto'
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler'
import {
  authorizeKnowledgeRead,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth'
import { getRequestUser } from '@/lib/auth-request-user'
import { truncateFlowPinText } from '@/lib/collection-flow-report-pins'
import {
  createFlowReportPin,
  deleteFlowReportPin,
  findFlowReportPin,
  getFlowReportPinById,
  listFlowReportPins,
  nextFlowReportPinSortOrder,
  type FlowOutputSnapshot,
} from '@/lib/db/collection-flow-report-pins'
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows'
import { getPlatformProjectById } from '@/lib/db/platform-projects'
import { platformJson } from '@/lib/platform-contract'

function authError(code: 'unauthorized' | 'forbidden' | 'contract'): Response {
  if (code === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (code === 'contract') {
    return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST)
  }
  return apiError('Forbidden', API_STATUS.FORBIDDEN)
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> },
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
    const user = await getRequestUser(request)
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

    const { platformProjectId, flowId } = await ctx.params
    const id = platformProjectId?.trim()
    const fid = flowId?.trim()
    if (!id || !fid) return apiError('Invalid id', API_STATUS.BAD_REQUEST)

    const auth = await authorizeKnowledgeRead(request, id)
    if ('error' in auth) return authError(auth.error)

    const row = await getCollectionTestFlow(id, fid)
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND)

    const items = await listFlowReportPins({ flowId: fid, userId: user.id })
    return platformJson({ items })
  } catch (e) {
    return handleApiError(e, { context: 'flow report pins GET' })
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> },
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
    const user = await getRequestUser(request)
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

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

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return apiError('Invalid JSON', API_STATUS.BAD_REQUEST)
    }

    const nodeId = typeof body.nodeId === 'string' ? body.nodeId.trim() : ''
    const kind = typeof body.kind === 'string' ? body.kind.trim() : 'output'
    const label = typeof body.label === 'string' ? body.label.trim() : nodeId
    const text = typeof body.text === 'string' ? truncateFlowPinText(body.text) : ''
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : null
    const historyRunId =
      typeof body.historyRunId === 'string' && body.historyRunId.trim()
        ? body.historyRunId.trim()
        : null

    if (!nodeId || !text) {
      return apiError('nodeId and text required', API_STATUS.BAD_REQUEST)
    }

    const existing = await findFlowReportPin({
      flowId: fid,
      userId: user.id,
      nodeId,
      historyRunId,
    })
    if (existing) {
      return platformJson({ item: existing, alreadyPinned: true })
    }

    const snapshot: FlowOutputSnapshot = {
      nodeId,
      kind,
      label: label || kind,
      text,
      imageUrl,
      historyRunId,
    }

    const item = await createFlowReportPin({
      id: randomUUID(),
      platformProjectId: id,
      flowId: fid,
      userId: user.id,
      historyRunId,
      nodeId,
      outputSnapshot: snapshot,
      sortOrder: await nextFlowReportPinSortOrder(fid, user.id),
    })

    return platformJson({ item, alreadyPinned: false }, { status: 201 })
  } catch (e) {
    return handleApiError(e, { context: 'flow report pins POST' })
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; flowId: string }> },
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
    const user = await getRequestUser(request)
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

    const { platformProjectId, flowId } = await ctx.params
    const id = platformProjectId?.trim()
    const fid = flowId?.trim()
    if (!id || !fid) return apiError('Invalid id', API_STATUS.BAD_REQUEST)

    const auth = await authorizeKnowledgeRead(request, id)
    if ('error' in auth) return authError(auth.error)

    const url = new URL(request.url)
    const pinId = url.searchParams.get('pinId')?.trim() || ''
    if (!pinId) return apiError('pinId required', API_STATUS.BAD_REQUEST)

    const pin = await getFlowReportPinById(pinId)
    if (!pin || pin.flowId !== fid || pin.userId !== user.id) {
      return apiError('Not found', API_STATUS.NOT_FOUND)
    }

    await deleteFlowReportPin(pinId)
    return platformJson({ ok: true })
  } catch (e) {
    return handleApiError(e, { context: 'flow report pins DELETE' })
  }
}
