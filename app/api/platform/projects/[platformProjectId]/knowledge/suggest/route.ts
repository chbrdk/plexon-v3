import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler'
import {
  authorizeKnowledgeRead,
  userCanEditKnowledgePack,
} from '@/lib/collection-knowledge-pack-auth'
import {
  researchKnowledgePack,
  SUGGESTABLE_FACETS,
} from '@/lib/assistant/knowledge-pack/research-knowledge-pack'
import {
  isKnowledgeFacetId,
  type KnowledgeFacetId,
} from '@/lib/collection-knowledge-pack'
import { getPlatformProjectById } from '@/lib/db/platform-projects'
import { getOrCreateKnowledgePack } from '@/lib/db/collection-knowledge-packs'
import { toKnowledgePackResponse } from '@/lib/collection-knowledge-pack'
import { platformJson } from '@/lib/platform-contract'

/**
 * POST /api/platform/projects/:id/knowledge/suggest
 * Body: { facetId?: KnowledgeFacetId } — omit for all suggestable facets.
 * Does not write the pack — returns drafts for preview.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)
    const { platformProjectId } = await ctx.params
    const id = platformProjectId?.trim()
    if (!id) return apiError('Invalid path', API_STATUS.BAD_REQUEST)

    const auth = await authorizeKnowledgeRead(request, id)
    if ('error' in auth) {
      if (auth.error === 'unauthorized') return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
      if (auth.error === 'contract') {
        return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST)
      }
      return apiError('Forbidden', API_STATUS.FORBIDDEN)
    }
    if (auth.kind !== 'session') {
      return apiError('Session required for suggest', API_STATUS.FORBIDDEN)
    }
    if (!(await userCanEditKnowledgePack(auth.user, id))) {
      return apiError('Forbidden', API_STATUS.FORBIDDEN)
    }

    const project = await getPlatformProjectById(id)
    if (!project) return apiError('Not found', API_STATUS.NOT_FOUND)

    const body = (await request.json().catch(() => ({}))) as { facetId?: string }
    let facetId: KnowledgeFacetId | undefined
    if (body.facetId != null && String(body.facetId).trim()) {
      const raw = String(body.facetId).trim()
      if (!isKnowledgeFacetId(raw)) {
        return apiError('Unknown facet', API_STATUS.UNPROCESSABLE)
      }
      if (raw === 'brand' || !SUGGESTABLE_FACETS.includes(raw)) {
        return apiError('Facet cannot be AI-suggested', API_STATUS.UNPROCESSABLE)
      }
      facetId = raw
    }

    const packRow = await getOrCreateKnowledgePack(id)
    const pack = toKnowledgePackResponse(packRow)
    const profileDomain = pack.facets.profile.data.primaryDomain?.trim()
    const domainOrUrl =
      profileDomain || project.domain?.trim() || null
    if (!domainOrUrl) {
      return apiError(
        'Set a Collection domain or profile.primaryDomain before AI suggest',
        API_STATUS.UNPROCESSABLE
      )
    }

    const displayName =
      pack.facets.profile.data.displayName?.trim() || project.name?.trim() || domainOrUrl

    const result = await researchKnowledgePack({
      domainOrUrl,
      displayName,
      facetId,
    })

    return platformJson({
      platformProjectId: id,
      revision: pack.revision,
      facetId: facetId ?? null,
      drafts: result.drafts,
      signalsSummary: result.signalsSummary,
      model: result.model,
      usedLlm: result.usedLlm,
      warning: result.warning ?? null,
    })
  } catch (e) {
    return handleApiError(e, { context: 'knowledge suggest POST' })
  }
}
