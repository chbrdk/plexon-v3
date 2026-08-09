import { getAssistantCompletionModel } from '@/lib/constants'
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export type EqcGeoRecommendation = NonNullable<GeoEeatJobPreview['recommendations']>[number]

const SYSTEM_PROMPT = `Du bist GEO-/Content-Strateg:in. Du schärfst Checkion-GEO-Moves zu konkreten deutschen Empfehlungen.

Regeln:
- Nur Fakten aus den Eingabe-Moves und dem Kontext nutzen — keine erfundenen Zahlen, Domains oder Scores.
- Jede Empfehlung bleibt dem gleichen Index zugeordnet (gleiche Priorität, gleiche Kategorie GEO).
- Titel: max. 90 Zeichen, konkret (Domain/Prompt/Lücke nennen wenn vorhanden).
- Description: 1–3 Sätze, actionable (was ändern, warum, woran messen).
- Deutsch, keine englischen Boilerplate-Floskeln wie „quotable proof block“.
- Antworte NUR mit gültigem JSON-Array:
[{"title":"...","description":"...","priority":1}]
Länge = Anzahl der Input-Moves, gleiche Reihenfolge.`

function buildContext(preview: GeoEeatJobPreview): string {
  const lines: string[] = []
  if (preview.url) lines.push(`URL: ${preview.url}`)
  if (preview.overallScore != null) lines.push(`GEO-Score: ${preview.overallScore}`)
  if (preview.geoFitnessScore != null) lines.push(`GEO-Fitness: ${preview.geoFitnessScore}`)
  const comps = (preview.competitors ?? []).slice(0, 5)
  if (comps.length) {
    lines.push(
      `Wettbewerb: ${comps
        .map((c) => {
          const sov =
            typeof c.shareOfVoice === 'number'
              ? c.shareOfVoice <= 1
                ? Math.round(c.shareOfVoice * 100)
                : Math.round(c.shareOfVoice)
              : null
          return `${c.name}${sov != null ? ` SoV ${sov}%` : ''}`
        })
        .join('; ')}`,
    )
  }
  if (preview.missingGeoElements?.length) {
    lines.push(`On-Page-Lücken: ${preview.missingGeoElements.slice(0, 6).join(', ')}`)
  }
  const cites = (preview.citationHighlights ?? []).slice(0, 6)
  if (cites.length) {
    lines.push(
      `Zitations-Beispiele: ${cites
        .map((c) => `„${c.query}“ → ${c.domain} (#${c.position})`)
        .join(' | ')}`,
    )
  }
  return lines.join('\n')
}

function parseRewritten(
  text: string,
  original: EqcGeoRecommendation[],
): EqcGeoRecommendation[] | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('[')
    const end = trimmed.lastIndexOf(']')
    if (start < 0 || end <= start) return null
    try {
      parsed = JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      return null
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const out: EqcGeoRecommendation[] = []
  for (let i = 0; i < original.length; i++) {
    const src = original[i]!
    const row = parsed[i] as { title?: unknown; description?: unknown; priority?: unknown } | undefined
    const title = typeof row?.title === 'string' ? row.title.trim() : ''
    const description = typeof row?.description === 'string' ? row.description.trim() : ''
    if (!title || !description) {
      out.push(src)
      continue
    }
    out.push({
      title: title.slice(0, 120),
      description: description.slice(0, 600),
      priority:
        typeof row?.priority === 'number' && Number.isFinite(row.priority)
          ? row.priority
          : src.priority,
    })
  }
  return out.length ? out : null
}

/**
 * LLM-sharpen Checkion-derived GEO moves for EQC magazine (DE, concrete).
 * Soft-fails to the original list when the key is missing or the model fails.
 */
export async function rewriteEqcGeoRecommendations(options: {
  apiKey?: string
  preview: GeoEeatJobPreview
}): Promise<EqcGeoRecommendation[]> {
  const original = options.preview.recommendations ?? []
  if (original.length === 0) return []

  const apiKey = options.apiKey?.trim()
  if (!apiKey) return original

  const movesJson = JSON.stringify(
    original.map((r, i) => ({
      index: i,
      title: r.title,
      description: r.description,
      priority: r.priority ?? i + 1,
    })),
  )

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: getAssistantCompletionModel(),
        max_tokens: 1600,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              'Kontext:',
              buildContext(options.preview),
              '',
              'Moves (JSON):',
              movesJson,
            ].join('\n'),
          },
        ],
      }),
    })
    if (!res.ok) return original
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
    return parseRewritten(text, original) ?? original
  } catch {
    return original
  }
}

/** Apply rewritten recommendations onto a geo preview (immutable). */
export function withRewrittenGeoRecommendations(
  preview: GeoEeatJobPreview,
  recommendations: EqcGeoRecommendation[],
): GeoEeatJobPreview {
  if (!recommendations.length) return preview
  return { ...preview, recommendations }
}
