/**
 * Collection Knowledge Pack AI research — homepage signals → typed facet drafts.
 * Spec: specs/domain/collection-knowledge-pack.md
 */

import { extractHomepageSignals } from '@/lib/assistant/event-quick-check/extract-homepage-signals'
import type { CompanyBriefHomepageSignals } from '@/lib/assistant/event-quick-check/company-brief-types'
import { normalizeEventQuickCheckUrl } from '@/lib/assistant/event-quick-check/event-quick-check-url'
import { getAssistantCompletionModel } from '@/lib/constants'
import {
  type CompetitiveData,
  type GeoContextData,
  type KnowledgeFacetId,
  type ProfileData,
  type ResearchBriefData,
  type SourcesData,
} from '@/lib/collection-knowledge-pack'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

/** Facets that AI may draft (never brand). */
export const SUGGESTABLE_FACETS: KnowledgeFacetId[] = [
  'profile',
  'competitive',
  'research_brief',
  'geo_context',
  'sources',
]

export type KnowledgePackDrafts = {
  profile?: ProfileData
  competitive?: CompetitiveData
  research_brief?: ResearchBriefData
  geo_context?: GeoContextData
  sources?: SourcesData
}

export type KnowledgePackSuggestResult = {
  drafts: KnowledgePackDrafts
  signalsSummary: {
    url: string
    domain: string
    pageTitle?: string
    fetchError?: string
  }
  model: string
  usedLlm: boolean
  warning?: string
}

type LlmPackPayload = {
  profile?: Partial<ProfileData> & { displayName?: string }
  competitive?: {
    category?: string | null
    competitors?: Array<{ host?: string; label?: string | null }>
    notes?: string | null
  }
  research_brief?: {
    summary?: string | null
    topics?: string[]
    sections?: Array<{ title?: string; plainText?: string; bullets?: string[] }>
  }
  geo_context?: {
    queryThemes?: string[]
    seedQueries?: string[]
    knownCompetitors?: string[]
    notes?: string | null
  }
}

const SYSTEM_PROMPT = `Du füllst ein Collection Knowledge Pack für PLEXON.
Nutze NUR die gelieferten Website-Signale. Erfinde keine Fakten, Domains oder Wettbewerber.
Wenn etwas unklar ist: leere Arrays / null — niemals raten.

Antworte NUR mit gültigem JSON (Felder weglassen die du nicht befüllen kannst):
{
  "profile": {
    "displayName": "string",
    "legalName": "string|null",
    "primaryDomain": "string|null — hostname ohne Schema",
    "aliases": ["string"],
    "markets": ["string — Märkte/Regionen wenn erkennbar"],
    "industry": "string|null",
    "tagline": "string|null — kurz",
    "languages": ["de"|"en"|…]
  },
  "competitive": {
    "category": "string|null — Produktkategorie",
    "competitors": [{"host":"example.com","label":"Name oder null"}],
    "notes": "string|null"
  },
  "research_brief": {
    "summary": "string|null — 2-4 Sätze Was das Unternehmen macht",
    "topics": ["string"],
    "sections": [{"title":"string","plainText":"string","bullets":["string"]}]
  },
  "geo_context": {
    "queryThemes": ["string — Findability-Themen"],
    "seedQueries": ["string — natürliche Suchfragen aus Positioning"],
    "knownCompetitors": ["hostname"],
    "notes": "string|null"
  }
}

Regeln:
- competitors / knownCompetitors NUR wenn die Site sie klar nennt; sonst [].
- seedQueries: 4-8 Fragen die ein Nutzer an eine KI stellen würde (DE wenn Site DE).
- research sections: max 3 kurze Abschnitte.
- primaryDomain = Domain aus den Signalen.`

function ensureUrl(domainOrUrl: string): string {
  const raw = domainOrUrl.trim()
  if (!raw) throw new Error('Domain required')
  try {
    return normalizeEventQuickCheckUrl(raw)
  } catch {
    return normalizeEventQuickCheckUrl(`https://${raw.replace(/^\/+/, '')}`)
  }
}

function fallbackProfile(
  displayName: string,
  signals: CompanyBriefHomepageSignals
): ProfileData {
  const name =
    signals.ogTitle?.trim()?.split(/[|\-–—]/)[0]?.trim() ||
    signals.pageTitle?.trim()?.split(/[|\-–—]/)[0]?.trim() ||
    displayName ||
    signals.domain
  return {
    displayName: name,
    legalName: null,
    primaryDomain: signals.domain,
    aliases: [],
    markets: [],
    industry: signals.h1[0]?.slice(0, 120) || null,
    tagline: signals.metaDescription?.slice(0, 200) || signals.ogDescription?.slice(0, 200) || null,
    languages: [],
  }
}

function fallbackResearch(
  displayName: string,
  signals: CompanyBriefHomepageSignals
): ResearchBriefData {
  const summary =
    signals.metaDescription?.trim() ||
    signals.ogDescription?.trim() ||
    (signals.h1[0] ? `${displayName}: ${signals.h1[0]}` : null)
  return {
    summary,
    sections: summary
      ? [
          {
            id: 'overview',
            title: 'Overview',
            plainText: summary,
            bullets: signals.h1.slice(0, 3),
          },
        ]
      : [],
    topics: signals.h1.slice(0, 5),
    sourceRunId: null,
    sourceProjectId: null,
  }
}

function fallbackSources(signals: CompanyBriefHomepageSignals): SourcesData {
  return {
    items: [
      {
        id: `src-home-${Date.now()}`,
        title: signals.pageTitle || signals.domain,
        url: signals.url,
        kind: 'link',
        mime: 'text/html',
        addedByProduct: 'plexon',
        addedAt: new Date().toISOString(),
      },
    ],
  }
}

function normalizeProfile(
  raw: LlmPackPayload['profile'] | undefined,
  signals: CompanyBriefHomepageSignals,
  displayName: string
): ProfileData {
  const base = fallbackProfile(displayName, signals)
  if (!raw) return base
  return {
    displayName: raw.displayName?.trim() || base.displayName,
    legalName: raw.legalName?.trim() || null,
    primaryDomain: raw.primaryDomain?.trim() || signals.domain,
    aliases: Array.isArray(raw.aliases)
      ? raw.aliases.map((a) => String(a).trim()).filter(Boolean).slice(0, 12)
      : [],
    markets: Array.isArray(raw.markets)
      ? raw.markets.map((a) => String(a).trim()).filter(Boolean).slice(0, 12)
      : [],
    industry: raw.industry?.trim() || base.industry,
    tagline: raw.tagline?.trim() || base.tagline,
    languages: Array.isArray(raw.languages)
      ? raw.languages.map((a) => String(a).trim()).filter(Boolean).slice(0, 8)
      : [],
  }
}

function normalizeCompetitive(raw: LlmPackPayload['competitive'] | undefined): CompetitiveData {
  const competitors = Array.isArray(raw?.competitors)
    ? raw!.competitors
        .map((c) => {
          const host = String(c.host ?? '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
          if (!host || !host.includes('.')) return null
          return {
            host,
            label: c.label?.trim() || null,
            source: 'human' as const,
            confidence: null,
          }
        })
        .filter(Boolean)
        .slice(0, 25)
    : []
  return {
    category: raw?.category?.trim() || null,
    competitors: competitors as CompetitiveData['competitors'],
    notes: raw?.notes?.trim() || null,
  }
}

function normalizeResearch(
  raw: LlmPackPayload['research_brief'] | undefined,
  displayName: string,
  signals: CompanyBriefHomepageSignals
): ResearchBriefData {
  if (!raw?.summary?.trim() && !raw?.sections?.length) {
    return fallbackResearch(displayName, signals)
  }
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .slice(0, 8)
        .map((s, i) => ({
          id: `ai-${i + 1}`,
          title: String(s.title ?? `Section ${i + 1}`).trim() || `Section ${i + 1}`,
          plainText: String(s.plainText ?? '').trim(),
          bullets: Array.isArray(s.bullets)
            ? s.bullets.map((b) => String(b).trim()).filter(Boolean).slice(0, 8)
            : undefined,
        }))
        .filter((s) => s.plainText)
    : []
  return {
    summary: raw.summary?.trim() || null,
    sections,
    topics: Array.isArray(raw.topics)
      ? raw.topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 16)
      : [],
    sourceRunId: null,
    sourceProjectId: null,
  }
}

function normalizeGeo(raw: LlmPackPayload['geo_context'] | undefined): GeoContextData {
  return {
    queryThemes: Array.isArray(raw?.queryThemes)
      ? raw!.queryThemes.map((t) => String(t).trim()).filter(Boolean).slice(0, 16)
      : [],
    seedQueries: Array.isArray(raw?.seedQueries)
      ? raw!.seedQueries.map((t) => String(t).trim()).filter(Boolean).slice(0, 24)
      : [],
    knownCompetitors: Array.isArray(raw?.knownCompetitors)
      ? raw!.knownCompetitors
          .map((h) =>
            String(h)
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, '')
              .replace(/\/.*$/, '')
          )
          .filter((h) => h.includes('.'))
          .slice(0, 25)
      : [],
    targetHosts: [],
    lastGeoJobId: null,
    notes: raw?.notes?.trim() || null,
  }
}

function pickFacets(
  all: KnowledgePackDrafts,
  facetId?: KnowledgeFacetId
): KnowledgePackDrafts {
  if (!facetId) return all
  if (facetId === 'brand') return {}
  const key = facetId as keyof KnowledgePackDrafts
  const value = all[key]
  return value != null ? { [key]: value } : {}
}

async function synthesizeWithLlm(
  displayName: string,
  signals: CompanyBriefHomepageSignals
): Promise<LlmPackPayload | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return null

  const excerpt = [
    `Anzeigename / Projekt: ${displayName}`,
    `URL: ${signals.url}`,
    `Domain: ${signals.domain}`,
    signals.pageTitle ? `Title: ${signals.pageTitle}` : null,
    signals.metaDescription ? `Meta: ${signals.metaDescription}` : null,
    signals.ogTitle ? `OG Title: ${signals.ogTitle}` : null,
    signals.ogDescription ? `OG Description: ${signals.ogDescription}` : null,
    signals.h1.length ? `H1: ${signals.h1.join(' | ')}` : null,
    signals.fetchError ? `Fetch-Hinweis: ${signals.fetchError}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAssistantCompletionModel(),
      max_tokens: 3200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: excerpt }],
    }),
  })

  if (!res.ok) return null
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!text) return null

  try {
    const jsonText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    return JSON.parse(jsonText) as LlmPackPayload
  } catch {
    return null
  }
}

/**
 * Research knowledge pack drafts from a Collection domain.
 * Does not persist — caller previews then PATCH merges.
 */
export async function researchKnowledgePack(input: {
  domainOrUrl: string
  displayName?: string
  facetId?: KnowledgeFacetId
}): Promise<KnowledgePackSuggestResult> {
  const url = ensureUrl(input.domainOrUrl)
  const signals = await extractHomepageSignals(url)
  const displayName = (input.displayName?.trim() || signals.domain).trim()
  const model = getAssistantCompletionModel()

  const llm = await synthesizeWithLlm(displayName, signals)
  const usedLlm = Boolean(llm)

  const all: KnowledgePackDrafts = {
    profile: normalizeProfile(llm?.profile, signals, displayName),
    competitive: normalizeCompetitive(llm?.competitive),
    research_brief: normalizeResearch(llm?.research_brief, displayName, signals),
    geo_context: normalizeGeo(llm?.geo_context),
    sources: fallbackSources(signals),
  }

  return {
    drafts: pickFacets(all, input.facetId),
    signalsSummary: {
      url: signals.url,
      domain: signals.domain,
      pageTitle: signals.pageTitle,
      fetchError: signals.fetchError,
    },
    model,
    usedLlm,
    warning: usedLlm
      ? undefined
      : !process.env.ANTHROPIC_API_KEY?.trim()
        ? 'ANTHROPIC_API_KEY missing — heuristic profile/sources only.'
        : 'LLM unavailable — heuristic profile/sources only.',
  }
}
