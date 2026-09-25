import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser, type RequestUser } from '@/lib/auth-request-user'
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth'
import { setClientRoomSlot } from '@/lib/collection-client-room'
import { userCanViewPlatformProject } from '@/lib/platform-project-access'
import { USER_ROLE } from '@/lib/db/schema'

const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'

/**
 * Set or clear a ClientRoom slot (approved artifact only).
 * Spec: suite-enterprise-program.md § E2
 *
 * Service secret path: actorUserId required (body or X-Plexon-User-Id).
 */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; slotId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { platformProjectId, slotId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id || !slotId?.trim()) return apiError('Invalid id', API_STATUS.BAD_REQUEST)

  const body = (await request.json().catch(() => ({}))) as {
    clear?: boolean
    productId?: string
    subjectRef?: string
    title?: string
    href?: string | null
    actorUserId?: string
  }

  let actor: RequestUser | null = null

  if (isServiceSecretAuthorized(request)) {
    if (!hasValidContractHeader(request)) {
      return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST)
    }
    const actorUserId =
      body.actorUserId?.trim() || request.headers.get(PLEXON_USER_ID_HEADER)?.trim() || ''
    if (!actorUserId) return apiError('actor_required', API_STATUS.BAD_REQUEST)
    const canView = await userCanViewPlatformProject(actorUserId, USER_ROLE.USER, id)
    if (!canView) return apiError('Forbidden', API_STATUS.FORBIDDEN)
    actor = { id: actorUserId, role: USER_ROLE.USER }
  } else {
    actor = await getRequestUser(request)
    if (!actor) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  }

  const result = await setClientRoomSlot({
    platformProjectId: id,
    actor,
    slotId: slotId.trim(),
    slot: body.clear
      ? null
      : {
          productId: body.productId ?? 'plexon',
          subjectRef: body.subjectRef ?? '',
          title: body.title ?? '',
          href: body.href ?? null,
        },
  })
  if (!result.ok) return apiError(result.error, result.status)
  return Response.json({ room: result.room })
}
