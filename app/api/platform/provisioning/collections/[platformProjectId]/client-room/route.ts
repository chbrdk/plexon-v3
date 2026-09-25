import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import {
  createOrRotateClientRoom,
  getActiveClientRoom,
  revokeClientRoom,
} from '@/lib/collection-client-room'
import { userCanViewPlatformProject } from '@/lib/platform-project-access'

/**
 * Enterprise E2 ClientRoom for a Collection.
 * Spec: specs/domain/suite-enterprise-program.md § E2
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

  const room = await getActiveClientRoom(id)
  return Response.json({ room })
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

  const body = (await request.json().catch(() => ({}))) as { expiresInDays?: unknown }
  const expiresInDays =
    typeof body.expiresInDays === 'number' && Number.isFinite(body.expiresInDays)
      ? body.expiresInDays
      : null

  const result = await createOrRotateClientRoom({
    platformProjectId: id,
    actor: user,
    expiresInDays,
  })
  if (!result.ok) return apiError(result.error, result.status)
  return Response.json({
    room: result.room,
    token: result.token,
    url: result.url,
  })
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { platformProjectId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST)

  const result = await revokeClientRoom({ platformProjectId: id, actor: user })
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status)
  return Response.json({ ok: true })
}
