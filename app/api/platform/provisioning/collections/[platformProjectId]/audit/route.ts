import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth'
import { listSuiteAuditEvents, recordSuiteAuditEvent, isSuiteAuditAction } from '@/lib/suite-audit'
import { userCanManageCollectionLifecycle, userCanViewPlatformProject } from '@/lib/platform-project-access'
import { USER_ROLE } from '@/lib/db/schema'

const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'

/**
 * Enterprise E4 suite audit list + product ingest.
 * Spec: suite-enterprise-program.md § E4
 *
 * Session: actor = session user (optional body.actorUserId ignored for privilege).
 * Service secret: actorUserId required in body or X-Plexon-User-Id — never invented.
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

  const items = await listSuiteAuditEvents(id, { limit: 80 })
  return Response.json({ items })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { platformProjectId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST)

  const body = (await request.json().catch(() => ({}))) as {
    productId?: string
    action?: string
    subjectRef?: string
    modelRef?: string
    meta?: Record<string, unknown>
    actorUserId?: string
  }

  if (!body.productId?.trim()) return apiError('product_required', API_STATUS.BAD_REQUEST)
  if (!body.action || !isSuiteAuditAction(body.action)) {
    return apiError('action_invalid', API_STATUS.BAD_REQUEST)
  }

  if (isServiceSecretAuthorized(request)) {
    if (!hasValidContractHeader(request)) {
      return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST)
    }
    const actorUserId =
      body.actorUserId?.trim() || request.headers.get(PLEXON_USER_ID_HEADER)?.trim() || ''
    if (!actorUserId) return apiError('actor_required', API_STATUS.BAD_REQUEST)
    const canView = await userCanViewPlatformProject(actorUserId, USER_ROLE.USER, id)
    if (!canView) return apiError('Forbidden', API_STATUS.FORBIDDEN)

    const result = await recordSuiteAuditEvent({
      actorUserId,
      platformProjectId: id,
      productId: body.productId.trim(),
      action: body.action,
      subjectRef: body.subjectRef,
      modelRef: body.modelRef,
      meta: body.meta,
    })
    if (!result.ok) return apiError(result.error, API_STATUS.BAD_REQUEST)
    return Response.json({ id: result.id })
  }

  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

  const canManage = await userCanManageCollectionLifecycle(user, id)
  if (!canManage) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const actorUserId = body.actorUserId?.trim() || user.id
  if (!actorUserId) return apiError('actor_required', API_STATUS.BAD_REQUEST)

  const result = await recordSuiteAuditEvent({
    actorUserId,
    platformProjectId: id,
    productId: body.productId.trim(),
    action: body.action,
    subjectRef: body.subjectRef,
    modelRef: body.modelRef,
    meta: body.meta,
  })
  if (!result.ok) return apiError(result.error, API_STATUS.BAD_REQUEST)
  return Response.json({ id: result.id })
}
