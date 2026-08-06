'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  EmptyState,
  Field,
  Input,
  Spinner,
  Text,
  Textarea,
} from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  apiPlatformProjectKnowledge,
  apiPlatformProjectKnowledgeFacet,
  apiPlatformProjectKnowledgeSuggest,
  pathPlatformProjectFlows,
} from '@/lib/constants'
import {
  KNOWLEDGE_FACET_IDS,
  facetPreview,
  isFacetContentEmpty,
  type CompetitiveData,
  type GeoContextData,
  type KnowledgeFacetId,
  type KnowledgePackResponse,
  type ProfileData,
  type ResearchBriefData,
  type SourcesData,
} from '@/lib/collection-knowledge-pack'
import type { KnowledgePackDrafts } from '@/lib/assistant/knowledge-pack/research-knowledge-pack'
import type {
  AudionProjectSummary,
  CheckionProjectSummary,
} from '@/lib/platform-project-dashboard-fetch'
import {
  AudionCapabilityView,
  BindingsCapabilityView,
  CheckionCapabilityView,
  type CollectionBinding,
} from '@/components/products/CollectionCapabilityViews'

const EDITABLE_FACETS: KnowledgeFacetId[] = [
  'profile',
  'competitive',
  'research_brief',
  'geo_context',
  'sources',
]

type CapabilityNavId = 'checkion' | 'audion' | 'bindings'
export type CollectionWorkNavId = KnowledgeFacetId | CapabilityNavId

const CAPABILITY_NAV_IDS: CapabilityNavId[] = ['checkion', 'audion', 'bindings']

function isKnowledgeFacetId(id: CollectionWorkNavId): id is KnowledgeFacetId {
  return (KNOWLEDGE_FACET_IDS as readonly string[]).includes(id)
}

type Props = {
  platformProjectId: string
  audionHref?: string | null
  checkionHref?: string | null
  checkion?: CheckionProjectSummary | null
  audion?: AudionProjectSummary | null
  bindings?: CollectionBinding[]
  /** Controlled work-band TOC selection (Overview teasers jump here). */
  openNav?: CollectionWorkNavId
  onOpenNav?: (id: CollectionWorkNavId) => void
  workBandRef?: RefObject<HTMLElement | null>
}

type SuggestResponse = {
  drafts: KnowledgePackDrafts
  revision: number
  warning?: string | null
  usedLlm?: boolean
  model?: string
  error?: string
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function facetLabelKey(id: KnowledgeFacetId): string {
  switch (id) {
    case 'profile':
      return 'projects.detail.knowledgeFacetProfile'
    case 'competitive':
      return 'projects.detail.knowledgeFacetCompetitive'
    case 'research_brief':
      return 'projects.detail.knowledgeFacetResearch'
    case 'geo_context':
      return 'projects.detail.knowledgeFacetGeo'
    case 'brand':
      return 'projects.detail.knowledgeFacetBrand'
    case 'sources':
      return 'projects.detail.knowledgeFacetSources'
  }
}

function facetDekKey(id: KnowledgeFacetId): string {
  switch (id) {
    case 'profile':
      return 'projects.detail.knowledgeFacetProfileDek'
    case 'competitive':
      return 'projects.detail.knowledgeFacetCompetitiveDek'
    case 'research_brief':
      return 'projects.detail.knowledgeFacetResearchDek'
    case 'geo_context':
      return 'projects.detail.knowledgeFacetGeoDek'
    case 'brand':
      return 'projects.detail.knowledgeFacetBrandDek'
    case 'sources':
      return 'projects.detail.knowledgeFacetSourcesDek'
  }
}

function ProvenanceLine({
  productId,
  updatedAt,
  note,
  sharedLabel,
}: {
  productId?: string | null
  updatedAt: string
  note?: string | null
  sharedLabel: string
}) {
  const when = (() => {
    try {
      return new Date(updatedAt).toLocaleString()
    } catch {
      return updatedAt
    }
  })()
  return (
    <Text role="meta">
      {sharedLabel} · {productId ?? 'plexon'} · {when}
      {note ? ` · ${note}` : ''}
    </Text>
  )
}

function ProfileRead({ data, empty }: { data: ProfileData; empty: string }) {
  if (isFacetContentEmpty('profile', data)) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="plexon-knowledge-facet-body">
      {data.displayName ? <Text role="title">{data.displayName}</Text> : null}
      {data.tagline ? <Text role="body">{data.tagline}</Text> : null}
      <Text role="meta">
        {[data.primaryDomain, data.industry, data.markets.join(', ')].filter(Boolean).join(' · ') ||
          '—'}
      </Text>
    </div>
  )
}

function CompetitiveRead({ data, empty }: { data: CompetitiveData; empty: string }) {
  if (isFacetContentEmpty('competitive', data)) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="plexon-knowledge-facet-body">
      {data.category ? <Text role="meta">{data.category}</Text> : null}
      <ul className="plexon-knowledge-list">
        {data.competitors.map((c) => (
          <li key={c.host}>
            <Text role="body">
              {c.host}
              {c.label ? ` — ${c.label}` : ''}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResearchRead({ data, empty }: { data: ResearchBriefData; empty: string }) {
  if (isFacetContentEmpty('research_brief', data)) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="plexon-knowledge-facet-body">
      {data.summary ? <Text role="body">{data.summary}</Text> : null}
      {data.topics.length ? <Text role="meta">{data.topics.join(' · ')}</Text> : null}
      {data.sections.map((s) => (
        <div key={s.id} className="plexon-knowledge-section">
          <Text role="title" as="h4">
            {s.title}
          </Text>
          <Text role="body">{s.plainText}</Text>
        </div>
      ))}
    </div>
  )
}

function GeoRead({ data, empty }: { data: GeoContextData; empty: string }) {
  if (isFacetContentEmpty('geo_context', data)) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="plexon-knowledge-facet-body">
      {data.queryThemes.length ? <Text role="meta">{data.queryThemes.join(' · ')}</Text> : null}
      {data.seedQueries.length ? (
        <ul className="plexon-knowledge-list">
          {data.seedQueries.map((q) => (
            <li key={q}>
              <Text role="body">{q}</Text>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SourcesRead({ data, empty }: { data: SourcesData; empty: string }) {
  if (!data.items.length) return <EmptyState>{empty}</EmptyState>
  return (
    <ul className="plexon-knowledge-list">
      {data.items.map((item) => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  )
}

function DraftPreview({ drafts }: { drafts: KnowledgePackDrafts }) {
  return (
    <div className="plexon-knowledge-draft-preview">
      {drafts.profile ? (
        <div>
          <Text role="meta">profile</Text>
          <Text role="title">{drafts.profile.displayName}</Text>
          <Text role="body">{drafts.profile.tagline || drafts.profile.industry || '—'}</Text>
        </div>
      ) : null}
      {drafts.competitive ? (
        <div>
          <Text role="meta">competitive</Text>
          <Text role="body">
            {drafts.competitive.category || '—'} · {drafts.competitive.competitors.length} rivals
          </Text>
        </div>
      ) : null}
      {drafts.research_brief ? (
        <div>
          <Text role="meta">research_brief</Text>
          <Text role="body">{drafts.research_brief.summary || '—'}</Text>
        </div>
      ) : null}
      {drafts.geo_context ? (
        <div>
          <Text role="meta">geo_context</Text>
          <Text role="body">{drafts.geo_context.seedQueries.slice(0, 3).join(' · ') || '—'}</Text>
        </div>
      ) : null}
      {drafts.sources ? (
        <div>
          <Text role="meta">sources</Text>
          <Text role="body">{drafts.sources.items.map((i) => i.url).join(', ')}</Text>
        </div>
      ) : null}
    </div>
  )
}

type ProfileForm = {
  displayName: string
  primaryDomain: string
  industry: string
  tagline: string
  markets: string
  aliases: string
  languages: string
}

function profileToForm(d: ProfileData): ProfileForm {
  return {
    displayName: d.displayName ?? '',
    primaryDomain: d.primaryDomain ?? '',
    industry: d.industry ?? '',
    tagline: d.tagline ?? '',
    markets: d.markets.join(', '),
    aliases: d.aliases.join(', '),
    languages: d.languages.join(', '),
  }
}

function formToProfile(f: ProfileForm, prev: ProfileData): ProfileData {
  return {
    ...prev,
    displayName: f.displayName.trim(),
    primaryDomain: f.primaryDomain.trim() || null,
    industry: f.industry.trim() || null,
    tagline: f.tagline.trim() || null,
    markets: splitCsv(f.markets),
    aliases: splitCsv(f.aliases),
    languages: splitCsv(f.languages),
  }
}

function capabilityLabelKey(id: CapabilityNavId): string {
  switch (id) {
    case 'checkion':
      return 'projects.detail.navCheckion'
    case 'audion':
      return 'projects.detail.navAudion'
    case 'bindings':
      return 'projects.detail.navBindings'
  }
}

export function CollectionKnowledgeBand({
  platformProjectId,
  audionHref,
  checkionHref,
  checkion = null,
  audion = null,
  bindings = [],
  openNav: openNavProp,
  onOpenNav,
  workBandRef,
}: Props) {
  const { t } = useI18n()
  const [pack, setPack] = useState<KnowledgePackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openNavInternal, setOpenNavInternal] = useState<CollectionWorkNavId>('profile')
  const openNav = openNavProp ?? openNavInternal
  const setOpenNav = (id: CollectionWorkNavId) => {
    onOpenNav?.(id)
    if (openNavProp === undefined) setOpenNavInternal(id)
  }
  const [canEdit, setCanEdit] = useState(true)

  const [editing, setEditing] = useState<KnowledgeFacetId | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null)
  const [competitiveForm, setCompetitiveForm] = useState<{
    category: string
    competitors: string
    notes: string
  } | null>(null)
  const [researchForm, setResearchForm] = useState<{ summary: string; topics: string } | null>(
    null
  )
  const [geoForm, setGeoForm] = useState<{
    themes: string
    seedQueries: string
    rivals: string
    notes: string
  } | null>(null)
  const [sourcesForm, setSourcesForm] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [previewDrafts, setPreviewDrafts] = useState<KnowledgePackDrafts | null>(null)
  const [previewWarning, setPreviewWarning] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const emptyCta = t('projects.detail.knowledgeEmptyCta')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectKnowledge(platformProjectId), {
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || res.statusText)
      }
      const json = (await res.json()) as KnowledgePackResponse
      setPack(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.knowledgeLoadError'))
    } finally {
      setLoading(false)
    }
  }, [platformProjectId, t])

  useEffect(() => {
    void load()
  }, [load])

  const startEdit = (facetId: KnowledgeFacetId) => {
    if (!pack || !EDITABLE_FACETS.includes(facetId)) return
    setEditing(facetId)
    setSaveError(null)
    const facet = pack.facets[facetId]
    if (facetId === 'profile') setProfileForm(profileToForm(facet.data as ProfileData))
    if (facetId === 'competitive') {
      const d = facet.data as CompetitiveData
      setCompetitiveForm({
        category: d.category ?? '',
        competitors: d.competitors
          .map((c) => (c.label ? `${c.host} — ${c.label}` : c.host))
          .join('\n'),
        notes: d.notes ?? '',
      })
    }
    if (facetId === 'research_brief') {
      const d = facet.data as ResearchBriefData
      setResearchForm({ summary: d.summary ?? '', topics: d.topics.join(', ') })
    }
    if (facetId === 'geo_context') {
      const d = facet.data as GeoContextData
      setGeoForm({
        themes: d.queryThemes.join(', '),
        seedQueries: d.seedQueries.join('\n'),
        rivals: d.knownCompetitors.join(', '),
        notes: d.notes ?? '',
      })
    }
    if (facetId === 'sources') {
      const d = facet.data as SourcesData
      setSourcesForm(d.items.map((i) => `${i.title} | ${i.url}`).join('\n'))
    }
  }

  const buildEditPayload = (facetId: KnowledgeFacetId): unknown => {
    if (!pack) return null
    if (facetId === 'profile' && profileForm) {
      return formToProfile(profileForm, pack.facets.profile.data as ProfileData)
    }
    if (facetId === 'competitive' && competitiveForm) {
      const competitors = competitiveForm.competitors
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [hostPart, ...rest] = line.split('—')
          const host = hostPart.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*/, '')
          const label = rest.join('—').trim() || null
          return { host, label, source: 'human' as const, confidence: null }
        })
        .filter((c) => c.host.includes('.'))
      return {
        category: competitiveForm.category.trim() || null,
        competitors,
        notes: competitiveForm.notes.trim() || null,
      } satisfies CompetitiveData
    }
    if (facetId === 'research_brief' && researchForm) {
      const prev = pack.facets.research_brief.data as ResearchBriefData
      return {
        ...prev,
        summary: researchForm.summary.trim() || null,
        topics: splitCsv(researchForm.topics),
      } satisfies ResearchBriefData
    }
    if (facetId === 'geo_context' && geoForm) {
      return {
        queryThemes: splitCsv(geoForm.themes),
        seedQueries: geoForm.seedQueries
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        knownCompetitors: splitCsv(geoForm.rivals),
        targetHosts: (pack.facets.geo_context.data as GeoContextData).targetHosts,
        lastGeoJobId: (pack.facets.geo_context.data as GeoContextData).lastGeoJobId,
        notes: geoForm.notes.trim() || null,
      } satisfies GeoContextData
    }
    if (facetId === 'sources') {
      const items = sourcesForm
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => {
          const [titlePart, urlPart] = line.split('|').map((s) => s.trim())
          const url = urlPart || titlePart
          const title = urlPart ? titlePart : url
          return {
            id: `src-${Date.now()}-${i}`,
            title,
            url,
            kind: 'link' as const,
            mime: null,
            addedByProduct: 'plexon' as const,
            addedAt: new Date().toISOString(),
          }
        })
        .filter((i) => /^https?:\/\//i.test(i.url) || i.url.includes('.'))
      return { items } satisfies SourcesData
    }
    return null
  }

  const patchFacet = async (
    facetId: KnowledgeFacetId,
    data: unknown,
    note: string,
    revision: number,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    const res = await fetch(apiPlatformProjectKnowledgeFacet(platformProjectId, facetId), {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        expectedRevision: revision,
        provenance: {
          actorType: note.startsWith('ai-') ? 'service' : 'user',
          productId: 'plexon',
          note,
        },
        data,
      }),
    })
    if (res.status === 403) {
      setCanEdit(false)
      throw new Error(t('projects.detail.knowledgeEditForbidden'))
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error || res.statusText)
    }
    return (await res.json()) as KnowledgePackResponse
  }

  const saveEdit = async () => {
    if (!pack || !editing) return
    const data = buildEditPayload(editing)
    if (data == null) return
    setSaving(true)
    setSaveError(null)
    try {
      const json = await patchFacet(editing, data, 'admin facet edit', pack.revision, 'replace')
      setPack(json)
      setEditing(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const runSuggest = async (facetId?: KnowledgeFacetId) => {
    setSuggesting(true)
    setSuggestError(null)
    setPreviewDrafts(null)
    setPreviewWarning(null)
    try {
      const res = await fetch(apiPlatformProjectKnowledgeSuggest(platformProjectId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facetId ? { facetId } : {}),
      })
      const body = (await res.json().catch(() => ({}))) as SuggestResponse & { error?: string }
      if (!res.ok) {
        throw new Error(
          body.error ||
            (res.status === 422
              ? t('projects.detail.knowledgeSuggestNoDomain')
              : t('projects.detail.knowledgeSuggestError'))
        )
      }
      setPreviewDrafts(body.drafts ?? {})
      setPreviewWarning(body.warning ?? null)
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : t('projects.detail.knowledgeSuggestError'))
    } finally {
      setSuggesting(false)
    }
  }

  const applyDrafts = async () => {
    if (!pack || !previewDrafts) return
    setApplying(true)
    setSuggestError(null)
    try {
      let revision = pack.revision
      let latest = pack
      const order: Array<keyof KnowledgePackDrafts> = [
        'profile',
        'competitive',
        'research_brief',
        'geo_context',
        'sources',
      ]
      for (const key of order) {
        const data = previewDrafts[key]
        if (data == null) continue
        latest = await patchFacet(key, data, 'ai-bootstrap', revision, 'merge')
        revision = latest.revision
      }
      setPack(latest)
      setPreviewDrafts(null)
      setPreviewWarning(null)
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : t('projects.detail.knowledgeSuggestError'))
      await load()
    } finally {
      setApplying(false)
    }
  }

  const toc = useMemo(() => {
    if (!pack) return []
    return KNOWLEDGE_FACET_IDS.map((id) => ({
      id: id as CollectionWorkNavId,
      empty: id === 'brand' ? false : isFacetContentEmpty(id, pack.facets[id].data),
      group: 'knowledge' as const,
    }))
  }, [pack])

  const capabilityToc = useMemo(
    () =>
      CAPABILITY_NAV_IDS.map((id) => ({
        id: id as CollectionWorkNavId,
        empty:
          id === 'checkion'
            ? !checkion
            : id === 'audion'
              ? !audion
              : bindings.length === 0,
        group: 'capability' as const,
      })),
    [audion, bindings.length, checkion],
  )

  const renderFacetBody = (id: KnowledgeFacetId): ReactNode => {
    if (!pack) return null
    const facet = pack.facets[id]
    if (id === 'brand') {
      return (
        <>
          <EmptyState>{t('projects.detail.knowledgeBrandReserved')}</EmptyState>
          <ProvenanceLine
            productId="brandion"
            updatedAt={facet.updatedAt}
            note="reserved"
            sharedLabel={t('projects.detail.knowledgeSharedBadge')}
          />
        </>
      )
    }
    const body =
      id === 'profile' ? (
        <ProfileRead data={facet.data as ProfileData} empty={emptyCta} />
      ) : id === 'competitive' ? (
        <CompetitiveRead data={facet.data as CompetitiveData} empty={emptyCta} />
      ) : id === 'research_brief' ? (
        <ResearchRead data={facet.data as ResearchBriefData} empty={emptyCta} />
      ) : id === 'geo_context' ? (
        <GeoRead data={facet.data as GeoContextData} empty={emptyCta} />
      ) : (
        <SourcesRead data={facet.data as SourcesData} empty={emptyCta} />
      )
    return (
      <>
        {body}
        <ProvenanceLine
          productId={facet.provenance.productId}
          updatedAt={facet.updatedAt}
          note={facet.provenance.note}
          sharedLabel={t('projects.detail.knowledgeSharedBadge')}
        />
      </>
    )
  }

  return (
    <section
      ref={workBandRef}
      className="plexon-dash-band plexon-knowledge-band"
      aria-label={t('projects.detail.magazineTitle')}
      data-section="collection-magazine"
      id="collection-work"
    >
      <header className="plexon-dash-band-head plexon-knowledge-band-head">
        <div>
          <Text role="title" as="h2" className="plexon-dash-band-title">
            {t('projects.detail.magazineTitle')}
          </Text>
          <Text role="meta" as="p" className="plexon-dash-band-deck">
            {t('projects.detail.magazineSubtitle')}
            {pack ? ` · ${t('projects.detail.knowledgeRev', { n: pack.revision })}` : ''}
          </Text>
        </div>
        {canEdit && pack && !loading && isKnowledgeFacetId(openNav) ? (
          <div className="plexon-knowledge-band-actions">
            <Button
              variant="primary"
              size="md"
              disabled={suggesting || applying}
              onClick={() => void runSuggest()}
            >
              {suggesting
                ? t('projects.detail.knowledgeSuggesting')
                : t('projects.detail.knowledgeSuggestAll')}
            </Button>
          </div>
        ) : null}
      </header>

      {loading ? (
        <Text role="meta" className="plexon-dash-band-status">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {suggestError ? <Alert tone="error">{suggestError}</Alert> : null}

      {!loading ? (
        <>
          <nav className="plexon-knowledge-toc" aria-label={t('projects.detail.magazineTitle')}>
            <div className="plexon-knowledge-toc-group" data-group="knowledge">
              {(pack ? toc : []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="plexon-knowledge-toc-link"
                  data-active={openNav === item.id ? 'true' : 'false'}
                  data-empty={item.empty ? 'true' : 'false'}
                  onClick={() => setOpenNav(item.id)}
                >
                  {t(facetLabelKey(item.id as KnowledgeFacetId))}
                </button>
              ))}
            </div>
            <span className="plexon-knowledge-toc-sep" aria-hidden="true" />
            <div className="plexon-knowledge-toc-group" data-group="capability">
              {capabilityToc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="plexon-knowledge-toc-link"
                  data-active={openNav === item.id ? 'true' : 'false'}
                  data-empty={item.empty ? 'true' : 'false'}
                  onClick={() => setOpenNav(item.id)}
                >
                  {t(capabilityLabelKey(item.id as CapabilityNavId))}
                </button>
              ))}
              <Link
                href={pathPlatformProjectFlows(platformProjectId)}
                className="plexon-knowledge-toc-link plexon-knowledge-toc-link--flows"
                data-empty="false"
              >
                {t('projects.detail.navFlows')}
              </Link>
            </div>
          </nav>

          <div className="plexon-knowledge-facet-grid">
            {pack
              ? KNOWLEDGE_FACET_IDS.map((id) => {
                  const facet = pack.facets[id]
                  const empty = id !== 'brand' && isFacetContentEmpty(id, facet.data)
                  const active = openNav === id
                  return (
                    <article
                      key={id}
                      className="plexon-knowledge-facet-tile"
                      data-active={active ? 'true' : 'false'}
                      data-empty={empty ? 'true' : 'false'}
                      hidden={!active}
                    >
                      <header className="plexon-knowledge-facet-tile-head">
                        <div>
                          <Text role="meta" as="p" className="plexon-collection-card-kicker">
                            {t('projects.detail.knowledgeSharedBadge')}
                            {id === 'brand' ? ' · reserved' : ''}
                          </Text>
                          <Text role="headline" as="h3" className="plexon-knowledge-facet-title">
                            {t(facetLabelKey(id))}
                          </Text>
                          <Text role="meta" as="p">
                            {t(facetDekKey(id))}
                          </Text>
                        </div>
                        <Chip static size="sm">
                          {facetPreview(id, facet.data) || (empty ? '—' : '·')}
                        </Chip>
                      </header>

                      <div className="plexon-knowledge-facet-tile-body">{renderFacetBody(id)}</div>

                      <div className="plexon-knowledge-facet-tile-actions">
                        {canEdit && EDITABLE_FACETS.includes(id) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="md"
                              disabled={suggesting}
                              onClick={() => void runSuggest(id)}
                            >
                              {t('projects.detail.knowledgeSuggestFacet')}
                            </Button>
                            <Button variant="ghost" size="md" onClick={() => startEdit(id)}>
                              {t('projects.detail.knowledgeEdit')}
                            </Button>
                          </>
                        ) : null}
                        {id === 'research_brief' && audionHref ? (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => window.open(audionHref, '_blank')}
                          >
                            {t('projects.detail.knowledgeOpenAudionResearch')}
                          </Button>
                        ) : null}
                        {id === 'geo_context' && checkionHref ? (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => window.open(checkionHref, '_blank')}
                          >
                            {t('projects.detail.knowledgeOpenCheckionGeo')}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  )
                })
              : null}

            <article
              className="plexon-knowledge-facet-tile"
              data-active={openNav === 'checkion' ? 'true' : 'false'}
              data-empty={!checkion ? 'true' : 'false'}
              hidden={openNav !== 'checkion'}
            >
              <CheckionCapabilityView checkion={checkion} href={checkionHref ?? ''} />
            </article>

            <article
              className="plexon-knowledge-facet-tile"
              data-active={openNav === 'audion' ? 'true' : 'false'}
              data-empty={!audion ? 'true' : 'false'}
              hidden={openNav !== 'audion'}
            >
              <AudionCapabilityView audion={audion} href={audionHref ?? ''} />
            </article>

            <article
              className="plexon-knowledge-facet-tile"
              data-active={openNav === 'bindings' ? 'true' : 'false'}
              data-empty={bindings.length === 0 ? 'true' : 'false'}
              hidden={openNav !== 'bindings'}
            >
              <BindingsCapabilityView bindings={bindings} />
            </article>
          </div>
        </>
      ) : null}

      <Dialog
        open={previewDrafts != null}
        onClose={() => {
          if (!applying) {
            setPreviewDrafts(null)
            setPreviewWarning(null)
          }
        }}
        title={t('projects.detail.knowledgeSuggestPreview')}
        className="plexon-edit-dialog"
        actions={
          <>
            <Button
              variant="ghost"
              size="md"
              disabled={applying}
              onClick={() => {
                setPreviewDrafts(null)
                setPreviewWarning(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={applying || !previewDrafts}
              onClick={() => void applyDrafts()}
            >
              {applying ? t('common.loading') : t('projects.detail.knowledgeApplyDrafts')}
            </Button>
          </>
        }
      >
        {previewWarning ? (
          <Alert tone="info">
            {t('projects.detail.knowledgeSuggestWarning')}: {previewWarning}
          </Alert>
        ) : null}
        {previewDrafts ? <DraftPreview drafts={previewDrafts} /> : null}
      </Dialog>

      <Dialog
        open={editing != null}
        onClose={() => {
          if (!saving) setEditing(null)
        }}
        title={editing ? t(facetLabelKey(editing)) : ''}
        className="plexon-edit-dialog"
        actions={
          <>
            <Button variant="ghost" size="md" disabled={saving} onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={saving}
              onClick={() => void saveEdit()}
            >
              {saving ? t('common.loading') : t('projects.detail.knowledgeSave')}
            </Button>
          </>
        }
      >
        <div className="plexon-edit-form">
          {saveError ? <Alert tone="error">{saveError}</Alert> : null}
          {editing === 'profile' && profileForm ? (
            <>
              <Field label={t('projects.detail.knowledgeFieldDisplayName')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.displayName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, displayName: e.target.value })
                  }
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldDomain')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.primaryDomain}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, primaryDomain: e.target.value })
                  }
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldIndustry')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.industry}
                  onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldTagline')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldMarkets')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.markets}
                  onChange={(e) => setProfileForm({ ...profileForm, markets: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldAliases')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.aliases}
                  onChange={(e) => setProfileForm({ ...profileForm, aliases: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldLanguages')} size="md">
                <Input
                  size="md"
                  block
                  value={profileForm.languages}
                  onChange={(e) => setProfileForm({ ...profileForm, languages: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {editing === 'competitive' && competitiveForm ? (
            <>
              <Field label={t('projects.detail.knowledgeFieldCategory')} size="md">
                <Input
                  size="md"
                  block
                  value={competitiveForm.category}
                  onChange={(e) =>
                    setCompetitiveForm({ ...competitiveForm, category: e.target.value })
                  }
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldCompetitors')} size="md">
                <Textarea
                  size="md"
                  block
                  rows={6}
                  value={competitiveForm.competitors}
                  onChange={(e) =>
                    setCompetitiveForm({ ...competitiveForm, competitors: e.target.value })
                  }
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldNotes')} size="md">
                <Textarea
                  size="md"
                  block
                  rows={3}
                  value={competitiveForm.notes}
                  onChange={(e) =>
                    setCompetitiveForm({ ...competitiveForm, notes: e.target.value })
                  }
                />
              </Field>
            </>
          ) : null}
          {editing === 'research_brief' && researchForm ? (
            <>
              <Field label={t('projects.detail.knowledgeFieldSummary')} size="md">
                <Textarea
                  size="md"
                  block
                  rows={5}
                  value={researchForm.summary}
                  onChange={(e) => setResearchForm({ ...researchForm, summary: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldTopics')} size="md">
                <Input
                  size="md"
                  block
                  value={researchForm.topics}
                  onChange={(e) => setResearchForm({ ...researchForm, topics: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {editing === 'geo_context' && geoForm ? (
            <>
              <Field label={t('projects.detail.knowledgeFieldThemes')} size="md">
                <Input
                  size="md"
                  block
                  value={geoForm.themes}
                  onChange={(e) => setGeoForm({ ...geoForm, themes: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldSeedQueries')} size="md">
                <Textarea
                  size="md"
                  block
                  rows={6}
                  value={geoForm.seedQueries}
                  onChange={(e) => setGeoForm({ ...geoForm, seedQueries: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldKnownCompetitors')} size="md">
                <Input
                  size="md"
                  block
                  value={geoForm.rivals}
                  onChange={(e) => setGeoForm({ ...geoForm, rivals: e.target.value })}
                />
              </Field>
              <Field label={t('projects.detail.knowledgeFieldNotes')} size="md">
                <Textarea
                  size="md"
                  block
                  rows={3}
                  value={geoForm.notes}
                  onChange={(e) => setGeoForm({ ...geoForm, notes: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {editing === 'sources' ? (
            <Field label={t('projects.detail.knowledgeFieldSources')} size="md">
              <Textarea
                size="md"
                block
                rows={6}
                value={sourcesForm}
                onChange={(e) => setSourcesForm(e.target.value)}
              />
            </Field>
          ) : null}
        </div>
      </Dialog>
    </section>
  )
}
