import { NextRequest } from 'next/server'
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler'
import { getRequestUser } from '@/lib/auth-request-user'
import { getVideonUrl } from '@/lib/constants'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract'

export const dynamic = 'force-dynamic'

const PLEXON_USER_HEADER = 'X-Plexon-User-Id'

const WRITE_ACTIONS = new Set(['analysis_run', 'brand_check_run'])
type WriteAction = 'analysis_run' | 'brand_check_run'

/**
 * Confirmed write proxy for assistant video hit actions.
 * Forwards to VIDEON analysis / brand-check with service secret + session actor.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', API_STATUS.BAD_REQUEST)
    }
    if (!body || typeof body !== 'object') {
      return apiError('Invalid body', API_STATUS.BAD_REQUEST)
    }
    const row = body as Record<string, unknown>
    const actionRaw = typeof row.action === 'string' ? row.action.trim() : ''
    const mediaAssetId = typeof row.mediaAssetId === 'string' ? row.mediaAssetId.trim() : ''
    const platformProjectId =
      typeof row.platformProjectId === 'string' ? row.platformProjectId.trim() : ''
    const confirmed = row.confirmed === true

    if (!WRITE_ACTIONS.has(actionRaw)) {
      return apiError('action must be analysis_run or brand_check_run', API_STATUS.BAD_REQUEST)
    }
    if (!mediaAssetId || !platformProjectId) {
      return apiError('mediaAssetId and platformProjectId are required', API_STATUS.BAD_REQUEST)
    }
    if (!confirmed) {
      return apiError('confirmed must be true', API_STATUS.BAD_REQUEST)
    }

    const action = actionRaw as WriteAction
    const base = getVideonUrl()?.replace(/\/+$/, '') ?? ''
    const secret = process.env.PLEXON_SERVICE_SECRET?.trim() ?? ''
    if (!base) return apiError('VIDEON URL not configured', 503)
    if (!secret) return apiError('Service secret not configured', 503)

    const path =
      action === 'analysis_run'
        ? `/api/media/${encodeURIComponent(mediaAssetId)}/analysis`
        : `/api/media/${encodeURIComponent(mediaAssetId)}/brand-check`
    const upstream = `${base}${path}?platformProjectId=${encodeURIComponent(platformProjectId)}`

    const res = await fetch(upstream, {
      method: 'POST',
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: secret,
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        [PLEXON_USER_HEADER]: user.id,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    })

    const text = await res.text()
    let payload: unknown = null
    if (text.trim()) {
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        payload = { raw: text.slice(0, 500) }
      }
    }

    if (!res.ok) {
      const status =
        res.status === 401 || res.status === 403
          ? res.status
          : res.status === 404
            ? 404
            : res.status === 409
              ? 409
              : 502
      return Response.json(
        {
          ok: false,
          action,
          status: res.status,
          error: `VIDEON ${action} failed (${res.status})`,
          upstream: payload,
        },
        { status },
      )
    }

    return Response.json({
      ok: true,
      action,
      status: res.status,
      result: payload,
    })
  } catch (e) {
    return handleApiError(e)
  }
}
