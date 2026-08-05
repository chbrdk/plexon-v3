/* ------------------------------------------------------------------ */
/*  GET /api/assistant/event-quick-check/readiness                     */
/*  Session: config gate for standalone Quick Check (CHECKION/AUDION). */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server'
import { apiError, API_STATUS } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import { getEventQuickCheckReadiness } from '@/lib/integrations/event-quick-check-readiness'

export async function GET(request: Request) {
  const user = await getRequestUser(request)
  if (!user?.id) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

  const readiness = getEventQuickCheckReadiness()
  return NextResponse.json(readiness)
}
