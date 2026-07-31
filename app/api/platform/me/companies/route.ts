import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import { listUserCompanies } from '@/lib/assistant/user-eligibility'

/** Session user's companies (id + name) for Collection create. */
export async function GET(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', API_STATUS.UNAVAILABLE)

  const items = await listUserCompanies(user.id)
  return Response.json({ items })
}
