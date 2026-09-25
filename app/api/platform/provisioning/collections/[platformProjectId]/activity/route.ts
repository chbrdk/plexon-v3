import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth'
import { listCollectionActivity, recordCollectionActivity } from '@/lib/collection-activity'
import { userCanManageCollectionLifecycle, userCanViewPlatformProject } from '@/lib/platform-project-access'
import { USER_ROLE } from '@/lib/db/schema'

const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'

/**
 * Enterprise E1 activity distillate ingest + list.
 * Spec: suite-enterprise-program.md § E1
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

  const items = await listCollectionActivity(id, { limit: 40 })
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
    kind?: string
    status?: string
    subjectRef?: string
    title?: string
    href?: string | null
    at?: string | null
    actorUserId?: string | null
  }

  if (isServiceSecretAuthorized(request)) {
    if (!hasValidContractHeader(request)) {
      return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST)
    }
    const actor =
      body.actorUserId?.trim() || request.headers.get(PLEXON_USER_ID_HEADER)?.trim() || null
    const canView = actor
      ? await userCanViewPlatformProject(actor, USER_ROLE.USER, id)
      : true
    if (actor && !canView) return apiError('Forbidden', API_STATUS.FORBIDDEN)

    const result = await recordCollectionActivity({
      platformProjectId: id,
      productId: body.productId ?? '',
      kind: body.kind ?? '',
      status: body.status ?? '',
      subjectRef: body.subjectRef ?? '',
      title: body.title ?? '',
      href: body.href,
      at: body.at,
      actorUserId: actor,
    })
    if (!result.ok) return apiError(result.error, API_STATUS.BAD_REQUEST)
    return Response.json({ id: result.id })
  }

  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  const canManage = await userCanManageCollectionLifecycle(user, id)
  if (!canManage) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const result = await recordCollectionActivity({
    platformProjectId: id,
    productId: body.productId ?? '',
    kind: body.kind ?? '',
    status: body.status ?? '',
    subjectRef: body.subjectRef ?? '',
    title: body.title ?? '',
    href: body.href,
    at: body.at,
    actorUserId: body.actorUserId?.trim() || user.id,
  })
  if (!result.ok) return apiError(result.error, API_STATUS.BAD_REQUEST)
  return Response.json({ id: result.id })
}
