import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser, type RequestUser } from '@/lib/auth-request-user'
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth'
import {
  listCollectionShareLinks,
  upsertCollectionShareLink,
} from '@/lib/collection-share-links'
import { USER_ROLE } from '@/lib/db/schema'
import { userCanViewPlatformProject } from '@/lib/platform-project-access'
import { platformJson } from '@/lib/platform-contract'

const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'

/**
 * Collection Share Links inventory + service upsert.
 * Spec: specs/domain/collection-share-links.md
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

  const { platformProjectId } = await ctx.params
  const id = platformProjectId?.trim()
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST)

  const includeRevoked = new URL(request.url).searchParams.get('includeRevoked') === '1'
  const result = await listCollectionShareLinks(id, user, { includeRevoked })
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status)
  return platformJson({ items: result.items })
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
    shareId?: string
    kind?: string
    title?: string
    href?: string | null
    expiresAt?: string | null
    revoked?: boolean
    meta?: Record<string, unknown>
    actorUserId?: string
  }

  let actor: RequestUser | null = null
  let serviceTrusted = false

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
    serviceTrusted = true
  } else {
    actor = await getRequestUser(request)
    if (!actor) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  }

  const result = await upsertCollectionShareLink({
    platformProjectId: id,
    productId: body.productId ?? '',
    shareId: body.shareId ?? '',
    kind: body.kind ?? '',
    title: body.title ?? '',
    href: body.href,
    expiresAt: body.expiresAt,
    revoked: body.revoked === true,
    meta: body.meta,
    serviceTrusted,
    actor,
  })
  if (!result.ok) return apiError(result.error, result.status)
  return platformJson({ item: result.item })
}
