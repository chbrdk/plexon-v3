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

/**
 * Same-origin poster proxy for assistant video_hit_strip.
 * Forwards to VIDEON GET /api/media/:id/frame with service secret + session actor.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)

    const mediaAssetId = request.nextUrl.searchParams.get('mediaAssetId')?.trim() ?? ''
    const platformProjectId = request.nextUrl.searchParams.get('platformProjectId')?.trim() ?? ''
    const tRaw = request.nextUrl.searchParams.get('t')
    if (!mediaAssetId || !platformProjectId) {
      return apiError('mediaAssetId and platformProjectId are required', API_STATUS.BAD_REQUEST)
    }

    const base = getVideonUrl()?.replace(/\/+$/, '') ?? ''
    const secret = process.env.PLEXON_SERVICE_SECRET?.trim() ?? ''
    if (!base) return apiError('VIDEON URL not configured', 503)
    if (!secret) return apiError('Service secret not configured', 503)

    const params = new URLSearchParams({ platformProjectId })
    if (tRaw != null && tRaw.trim() !== '') params.set('t', tRaw.trim())
    const upstream = `${base}/api/media/${encodeURIComponent(mediaAssetId)}/frame?${params.toString()}`

    const res = await fetch(upstream, {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: secret,
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        [PLEXON_USER_HEADER]: user.id,
        Accept: 'image/jpeg',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const status =
        res.status === 401 || res.status === 403
          ? res.status
          : res.status === 404
            ? 404
            : res.status === 409
              ? 409
              : 502
      return apiError(`VIDEON frame failed (${res.status})`, status)
    }

    const bytes = await res.arrayBuffer()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
        'Content-Length': String(bytes.byteLength),
      },
    })
  } catch (e) {
    return handleApiError(e)
  }
}
