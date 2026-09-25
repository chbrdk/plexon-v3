import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import { bootstrapUserHome } from '@/lib/bootstrap-user-home'

/**
 * POST /api/platform/me/bootstrap-home
 * Idempotent: ensures company membership and optionally a first Collection.
 */
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  let body: { createCollection?: boolean; collectionName?: string } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }

  const result = await bootstrapUserHome(user, {
    createCollection: body.createCollection !== false,
    collectionName: body.collectionName,
  })

  return Response.json(result)
}
