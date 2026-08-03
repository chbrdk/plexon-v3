'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Accordion,
  Alert,
  Button,
  Chip,
  EmptyState,
  Field,
  SectionChrome,
  Spinner,
  Text,
  Textarea,
} from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  apiPlatformProjectKnowledge,
  apiPlatformProjectKnowledgeFacet,
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

const EDITABLE_FACETS: KnowledgeFacetId[] = [
  'profile',
  'competitive',
  'research_brief',
  'geo_context',
]

const FACET_LABELS: Record<KnowledgeFacetId, string> = {
  profile: 'Profile',
  competitive: 'Competitive',
  research_brief: 'Research brief',
  geo_context: 'GEO context',
  brand: 'Brand',
  sources: 'Sources',
}

const FACET_DEKS: Record<KnowledgeFacetId, string> = {
  profile: 'Shared company profile for launch forms and research seeds.',
  competitive: 'Shared rivals and category for GEO and research framing.',
  research_brief: 'Distilled research from AUDION — plain text, not the full dossier.',
  geo_context: 'Findability themes from CHECKION GEO — not full query runs.',
  brand: 'Brand system references will arrive with Brandion.',
  sources: 'Link registry for the Collection — metadata only.',
}

type Props = {
  platformProjectId: string
  audionHref?: string | null
  checkionHref?: string | null
}

function ProvenanceLine({
  productId,
  updatedAt,
  note,
}: {
  productId?: string | null
  updatedAt: string
  note?: string | null
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
      Shared · {productId ?? 'plexon'} · {when}
      {note ? ` · ${note}` : ''}
    </Text>
  )
}

function ProfileRead({ data }: { data: ProfileData }) {
  if (isFacetContentEmpty('profile', data)) {
    return <EmptyState>Add a shared profile for this Collection.</EmptyState>
  }
  return (
    <div className="plexon-knowledge-facet-body">
      {data.displayName ? <Text role="title">{data.displayName}</Text> : null}
      {data.tagline ? <Text role="body">{data.tagline}</Text> : null}
      <Text role="meta">
        {[data.primaryDomain, data.industry, data.markets.join(', ')].filter(Boolean).join(' · ') ||
          '—'}
      </Text>
      {data.aliases.length ? (
        <Text role="meta">Aliases: {data.aliases.join(', ')}</Text>
      ) : null}
    </div>
  )
}

function CompetitiveRead({ data }: { data: CompetitiveData }) {
  if (isFacetContentEmpty('competitive', data)) {
    return <EmptyState>No shared competitors yet.</EmptyState>
  }
  return (
    <div className="plexon-knowledge-facet-body">
      {data.category ? <Text role="meta">Category: {data.category}</Text> : null}
      <ul className="plexon-knowledge-list">
        {data.competitors.map((c) => (
          <li key={c.host}>
            <Text role="body">
              {c.host}
              {c.label ? ` — ${c.label}` : ''}{' '}
              <Chip static>{c.source}</Chip>
            </Text>
          </li>
        ))}
      </ul>
      {data.notes ? <Text role="meta">{data.notes}</Text> : null}
    </div>
  )
}

function ResearchRead({ data }: { data: ResearchBriefData }) {
  if (isFacetContentEmpty('research_brief', data)) {
    return <EmptyState>Publish a research distillate from AUDION.</EmptyState>
  }
  return (
    <div className="plexon-knowledge-facet-body">
      {data.summary ? <Text role="body">{data.summary}</Text> : null}
      {data.topics.length ? (
        <Text role="meta">Topics: {data.topics.join(' · ')}</Text>
      ) : null}
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

function GeoRead({ data }: { data: GeoContextData }) {
  if (isFacetContentEmpty('geo_context', data)) {
    return <EmptyState>Run GEO in CHECKION, then publish findability context.</EmptyState>
  }
  return (
    <div className="plexon-knowledge-facet-body">
      {data.queryThemes.length ? (
        <Text role="meta">Themes: {data.queryThemes.join(' · ')}</Text>
      ) : null}
      {data.seedQueries.length ? (
        <ul className="plexon-knowledge-list">
          {data.seedQueries.map((q) => (
            <li key={q}>
              <Text role="body">{q}</Text>
            </li>
          ))}
        </ul>
      ) : null}
      {data.knownCompetitors.length ? (
        <Text role="meta">Rivals: {data.knownCompetitors.join(', ')}</Text>
      ) : null}
    </div>
  )
}

function SourcesRead({ data }: { data: SourcesData }) {
  if (!data.items.length) {
    return <EmptyState>No sources linked yet.</EmptyState>
  }
  return (
    <ul className="plexon-knowledge-list">
      {data.items.map((item) => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
          <Text role="meta"> · {item.kind}</Text>
        </li>
      ))}
    </ul>
  )
}

export function CollectionKnowledgeBand({
  platformProjectId,
  audionHref,
  checkionHref,
}: Props) {
  const { t } = useI18n()
  const [pack, setPack] = useState<KnowledgePackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openFacet, setOpenFacet] = useState<string | null>(null)
  const [editing, setEditing] = useState<KnowledgeFacetId | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(true)

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
      const first =
        KNOWLEDGE_FACET_IDS.find(
          (id) => id !== 'brand' && !isFacetContentEmpty(id, json.facets[id].data)
        ) ?? 'profile'
      setOpenFacet((prev) => prev ?? first)
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
    setDraft(JSON.stringify(pack.facets[facetId].data, null, 2))
  }

  const saveEdit = async () => {
    if (!pack || !editing) return
    setSaving(true)
    setSaveError(null)
    try {
      let data: unknown
      try {
        data = JSON.parse(draft) as unknown
      } catch {
        throw new Error('Invalid JSON')
      }
      const res = await fetch(apiPlatformProjectKnowledgeFacet(platformProjectId, editing), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'replace',
          expectedRevision: pack.revision,
          provenance: {
            actorType: 'user',
            productId: 'plexon',
            note: 'admin facet edit',
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
      const json = (await res.json()) as KnowledgePackResponse
      setPack(json)
      setEditing(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toc = useMemo(() => {
    if (!pack) return []
    return KNOWLEDGE_FACET_IDS.map((id) => ({
      id,
      label: FACET_LABELS[id],
      empty: id === 'brand' ? false : isFacetContentEmpty(id, pack.facets[id].data),
    }))
  }, [pack])

  const accordionItems = useMemo(() => {
    if (!pack) return []
    return KNOWLEDGE_FACET_IDS.map((id) => {
      const facet = pack.facets[id]
      const preview = facetPreview(id, facet.data)
      let panel: ReactNode
      if (id === 'brand') {
        panel = (
          <div className="plexon-knowledge-facet-body">
            <EmptyState>
              {t('projects.detail.knowledgeBrandReserved')}
            </EmptyState>
            <ProvenanceLine
              productId="brandion"
              updatedAt={facet.updatedAt}
              note="reserved"
            />
          </div>
        )
      } else if (editing === id) {
        panel = (
          <div className="plexon-knowledge-edit">
            <Field label={`${FACET_LABELS[id]} (JSON)`} htmlFor={`knowledge-edit-${id}`}>
              <Textarea
                id={`knowledge-edit-${id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={12}
              />
            </Field>
            {saveError ? <Alert tone="error">{saveError}</Alert> : null}
            <div className="plexon-knowledge-edit-actions">
              <Button variant="primary" onClick={() => void saveEdit()} disabled={saving}>
                {saving ? t('settings.profile.saving') : t('projects.detail.knowledgeSave')}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )
      } else {
        const body =
          id === 'profile' ? (
            <ProfileRead data={facet.data as ProfileData} />
          ) : id === 'competitive' ? (
            <CompetitiveRead data={facet.data as CompetitiveData} />
          ) : id === 'research_brief' ? (
            <ResearchRead data={facet.data as ResearchBriefData} />
          ) : id === 'geo_context' ? (
            <GeoRead data={facet.data as GeoContextData} />
          ) : (
            <SourcesRead data={facet.data as SourcesData} />
          )
        panel = (
          <div className="plexon-knowledge-facet-body">
            <Text role="meta">{FACET_DEKS[id]}</Text>
            <Chip static>{t('projects.detail.knowledgeSharedBadge')}</Chip>
            {body}
            <ProvenanceLine
              productId={facet.provenance.productId}
              updatedAt={facet.updatedAt}
              note={facet.provenance.note}
            />
            {canEdit && EDITABLE_FACETS.includes(id) ? (
              <Button variant="ghost" size="sm" onClick={() => startEdit(id)}>
                {t('projects.detail.knowledgeEdit')}
              </Button>
            ) : null}
            {id === 'research_brief' && audionHref ? (
              <Button variant="ghost" size="sm" onClick={() => window.open(audionHref, '_blank')}>
                {t('projects.detail.knowledgeOpenAudionResearch')}
              </Button>
            ) : null}
            {id === 'geo_context' && checkionHref ? (
              <Button variant="ghost" size="sm" onClick={() => window.open(checkionHref, '_blank')}>
                {t('projects.detail.knowledgeOpenCheckionGeo')}
              </Button>
            ) : null}
          </div>
        )
      }
      return {
        id,
        title: (
          <span>
            {FACET_LABELS[id]}
            {id === 'brand' ? (
              <Chip static>Reserved</Chip>
            ) : isFacetContentEmpty(id, facet.data) ? null : (
              <Chip static>Shared</Chip>
            )}
          </span>
        ),
        preview,
        panel,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveEdit closes over draft/pack
  }, [pack, editing, draft, saving, saveError, canEdit, audionHref, checkionHref, t])

  return (
    <section
      className="plexon-settings-section plexon-knowledge-band"
      aria-label={t('projects.detail.knowledgeTitle')}
      data-section="collection-knowledge"
    >
      <SectionChrome
        title={t('projects.detail.knowledgeTitle')}
        meta={
          <Text role="meta">
            {t('projects.detail.knowledgeSubtitle')}
            {pack ? ` · rev ${pack.revision}` : ''}
          </Text>
        }
        as="h3"
        quiet
      />

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {pack && !loading ? (
        <>
          <nav className="plexon-knowledge-toc" aria-label="Knowledge facets">
            {toc.map((item) => (
              <button
                key={item.id}
                type="button"
                className="plexon-knowledge-toc-link"
                data-empty={item.empty ? 'true' : 'false'}
                onClick={() => setOpenFacet(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Accordion
            aria-label={t('projects.detail.knowledgeTitle')}
            items={accordionItems}
            value={openFacet}
            onChange={setOpenFacet}
          />
        </>
      ) : null}
    </section>
  )
}
