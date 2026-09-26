import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import { revokeCollectionShareLink } from '@/lib/collection-share-links'
import { platformJson } from '@/lib/platform-contract'

/**
 * Revoke a Collection share-link projection.
 * Spec: specs/domain/collection-share-links.md
 * Query: productId (required)
 */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string; shareId: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

  const { platformProjectId, shareId } = await ctx.params
  const id = platformProjectId?.trim()
  const sid = shareId?.trim()
  if (!id || !sid) return apiError('Invalid id', API_STATUS.BAD_REQUEST)

  const productId = new URL(request.url).searchParams.get('productId')?.trim() || ''
  if (!productId) return apiError('productId required', API_STATUS.BAD_REQUEST)

  const result = await revokeCollectionShareLink({
    platformProjectId: id,
    productId,
    shareId: sid,
    actor: user,
  })
  if (!result.ok) return apiError(result.error, result.status)
  return platformJson({ ok: true })
}
