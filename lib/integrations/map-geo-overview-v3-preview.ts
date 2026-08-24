import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client'
import { formatGeoModelLabel, sortGeoModelIds } from '@/lib/integrations/format-geo-model-label'
import {
  GEO_COMPETITIVE_ANSWER_TEXT_MAX,
  GEO_COMPETITIVE_CITATION_TARGET,
} from '@/lib/integrations/geo-competitive-answer-limits'

type V3GeoCitation = { domain?: string; position?: number; context?: string }
type V3GeoQueryRun = {
  queryId?: string
  query?: string
  modelId?: string
  answerText?: string
  citations?: V3GeoCitation[]
  ourPosition?: number | null
}
type V3GeoShare = {
  domain?: string
  shareOfVoice?: number
  avgPosition?: number
  mentionCount?: number
  isTarget?: boolean
}
type V3GeoRec = { title?: string; body?: string; severity?: string; id?: string }
type V3GeoEeat = {
  experience?: number
  expertise?: number
  authoritativeness?: number
  trustworthiness?: number
  geoFitness?: number
  experienceReasoning?: string
  expertiseReasoning?: string
  authoritativenessReasoning?: string
  trustworthinessReasoning?: string
  geoFitnessReasoning?: string
  missingElements?: string[]
}

export type GeoOverviewV3Like = {
  job?: {
    id?: string
    url?: string
    status?: string
    overallScore?: number | null
    citedShare?: number | null
  }
  eeat?: V3GeoEeat
  recommendations?: V3GeoRec[]
  models?: string[]
  queries?: string[]
  competitors?: string[]
  shareOfVoice?: V3GeoShare[]
  presence?: {
    field?: { shareOfVoice?: V3GeoShare[] } | null
    rivals?: string[]
    solo?: { citedShare?: number | null; shareOfVoice?: number | null }
  }
  queryRuns?: V3GeoQueryRun[]
}

function dim(
  score: number | undefined,
  reasoning?: string
): { score: number; reasoning?: string } | undefined {
  if (typeof score !== 'number' || !Number.isFinite(score)) return undefined
  const why = reasoning?.trim()
  return why ? { score, reasoning: why.slice(0, 420) } : { score }
}

/** Map CHECKION v3 GeoOverview JSON → assistant GeoEeatJobPreview. */
export function mapGeoOverviewV3ToPreview(
  overview: GeoOverviewV3Like,
  fallbackJobId: string
): GeoEeatJobPreview {
  const job = overview.job ?? {}
  const jobId = String(job.id ?? fallbackJobId)
  const url = String(job.url ?? '')
  const rawStatus = String(job.status ?? 'unknown')
  const status =
    rawStatus === 'completed' || rawStatus === 'complete'
      ? 'complete'
      : rawStatus === 'failed'
        ? 'error'
        : rawStatus

  const eeat = overview.eeat
  const geoFitnessScore =
    typeof eeat?.geoFitness === 'number' && Number.isFinite(eeat.geoFitness)
      ? eeat.geoFitness
      : null

  const shareRows =
    overview.shareOfVoice?.length
      ? overview.shareOfVoice
      : overview.presence?.field?.shareOfVoice ?? []

  const competitors: NonNullable<GeoEeatJobPreview['competitors']> = []
  for (const row of shareRows) {
    if (row.isTarget) continue
    const domain = String(row.domain ?? '').trim()
    if (!domain) continue
    competitors.push({
      name: domain,
      score:
        typeof row.shareOfVoice === 'number'
          ? Math.min(100, Math.round(row.shareOfVoice * (row.shareOfVoice <= 1 ? 100 : 1)))
          : null,
      shareOfVoice: row.shareOfVoice,
      avgPosition: row.avgPosition,
      mentionCount: row.mentionCount,
    })
  }
  for (const name of overview.competitors ?? []) {
    const n = String(name).trim()
    if (!n || competitors.some((c) => c.name === n)) continue
    competitors.push({ name: n, score: null })
  }

  const recommendations = (overview.recommendations ?? [])
    .map((r) => ({
      title: String(r.title ?? 'Empfehlung'),
      description: String(r.body ?? ''),
      priority: r.severity === 'high' ? 1 : r.severity === 'medium' ? 2 : 3,
    }))
    .filter((r) => r.title)
    .slice(0, 8)

  const runs = overview.queryRuns ?? []
  const byModel = new Map<
    string,
    {
      citations: Array<{ query: string; domain: string; position: number }>
      runs: Array<{
        queryId?: string
        query: string
        answerText?: string
        citations: Array<{ domain: string; position: number; context?: string }>
      }>
    }
  >()

  for (const run of runs) {
    const modelId = String(run.modelId ?? 'default')
    const query = String(run.query ?? '')
    if (!byModel.has(modelId)) {
      byModel.set(modelId, { citations: [], runs: [] })
    }
    const bucket = byModel.get(modelId)!
    const citations = (run.citations ?? [])
      .map((c) => ({
        domain: String(c.domain ?? ''),
        position: Number(c.position ?? 0),
        context: typeof c.context === 'string' ? c.context : undefined,
      }))
      .filter((c) => c.domain)
    for (const c of citations.slice(0, GEO_COMPETITIVE_CITATION_TARGET)) {
      bucket.citations.push({ query, domain: c.domain, position: c.position })
    }
    const answerText = typeof run.answerText === 'string' ? run.answerText : undefined
    bucket.runs.push({
      queryId: run.queryId,
      query,
      answerText:
        answerText && answerText.length > GEO_COMPETITIVE_ANSWER_TEXT_MAX
          ? `${answerText.slice(0, GEO_COMPETITIVE_ANSWER_TEXT_MAX)}…`
          : answerText,
      citations,
    })
  }

  const citationHighlightsByModel = sortGeoModelIds([...byModel.keys()]).map((modelId) => {
    const bucket = byModel.get(modelId)!
    return {
      modelId,
      modelLabel: formatGeoModelLabel(modelId),
      citations: bucket.citations.slice(0, GEO_COMPETITIVE_CITATION_TARGET * 12),
      runs: bucket.runs.slice(0, 12),
    }
  })

  const citationHighlights = citationHighlightsByModel[0]?.citations ?? []

  const citedFromJob =
    typeof job.citedShare === 'number' && Number.isFinite(job.citedShare)
      ? job.citedShare <= 1
        ? Math.round(job.citedShare * 100)
        : Math.round(job.citedShare)
      : null
  const citedFromSolo =
    typeof overview.presence?.solo?.citedShare === 'number' &&
    Number.isFinite(overview.presence.solo.citedShare)
      ? overview.presence.solo.citedShare <= 1
        ? Math.round(overview.presence.solo.citedShare * 100)
        : Math.round(overview.presence.solo.citedShare)
      : null
  const targetShare = shareRows.find((row) => row.isTarget)
  const citedFromTargetShare =
    typeof targetShare?.shareOfVoice === 'number' && Number.isFinite(targetShare.shareOfVoice)
      ? targetShare.shareOfVoice <= 1
        ? Math.round(targetShare.shareOfVoice * 100)
        : Math.round(targetShare.shareOfVoice)
      : null

  return {
    jobId,
    url,
    status,
    overallScore: job.overallScore ?? null,
    citedShare: citedFromJob ?? citedFromSolo ?? citedFromTargetShare,
    geoFitnessScore,
    eeatScores: eeat
      ? {
          experience: dim(eeat.experience, eeat.experienceReasoning),
          expertise: dim(eeat.expertise, eeat.expertiseReasoning),
          authoritativeness: dim(eeat.authoritativeness, eeat.authoritativenessReasoning),
          trust: dim(eeat.trustworthiness, eeat.trustworthinessReasoning),
        }
      : undefined,
    geoFitnessReasoning: eeat?.geoFitnessReasoning?.trim() || undefined,
    missingGeoElements: eeat?.missingElements?.map((x) => String(x).trim()).filter(Boolean),
    competitors: competitors.length > 0 ? competitors : undefined,
    keywords: overview.queries?.length ? overview.queries : undefined,
    queries: overview.queries,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    citationHighlights: citationHighlights.length > 0 ? citationHighlights : undefined,
    citationHighlightsByModel:
      citationHighlightsByModel.length > 0 ? citationHighlightsByModel : undefined,
  }
}
