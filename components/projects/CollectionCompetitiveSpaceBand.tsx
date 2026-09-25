'use client'

/**
 * Enterprise E8 — Wettbewerbsraum (read-only).
 * Spec: suite-enterprise-program.md § E8
 * Facets only — no new KPIs.
 */

import { useCallback, useEffect, useState } from 'react'
import NextLink from 'next/link'
import { Button, EmptyState, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  apiPlatformProjectKnowledge,
  pathAssistantWithProjectAndDraft,
} from '@/lib/constants'
import {
  isFacetContentEmpty,
  type CompetitiveData,
  type KnowledgePackResponse,
  type MarketIntelligenceData,
} from '@/lib/collection-knowledge-pack'
import type { AudionProjectSummary } from '@/lib/platform-project-dashboard-fetch'
import type { CollectionWorkNavId } from '@/components/products/CollectionKnowledgeBand'

type Props = {
  platformProjectId: string
  audion: AudionProjectSummary | null
  onOpenWork: (id: CollectionWorkNavId) => void
}

export function CollectionCompetitiveSpaceBand({
  platformProjectId,
  audion,
  onOpenWork,
}: Props) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [competitive, setCompetitive] = useState<CompetitiveData | null>(null)
  const [market, setMarket] = useState<MarketIntelligenceData | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectKnowledge(platformProjectId), {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(t('projects.detail.competitiveSpaceLoadError'))
      const pack = (await res.json()) as KnowledgePackResponse
      const c = pack.facets?.competitive?.data as CompetitiveData | undefined
      const m = pack.facets?.market_intelligence?.data as MarketIntelligenceData | undefined
      setCompetitive(c ?? null)
      setMarket(m ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.competitiveSpaceLoadError'))
      setCompetitive(null)
      setMarket(null)
    } finally {
      setLoading(false)
    }
  }, [platformProjectId, t])

  useEffect(() => {
    void load()
  }, [load])

  const persona = audion?.personas?.[0] ?? null
  const personaDraft = persona
    ? t('projects.detail.askPersonaPagesDraft').replace('{name}', persona.name)
    : t('projects.detail.askPersonaPagesDraftGeneric')
  const personaHref = pathAssistantWithProjectAndDraft(platformProjectId, personaDraft)

  const competitiveEmpty =
    !competitive || isFacetContentEmpty('competitive', competitive)
  const marketEmpty = !market || isFacetContentEmpty('market_intelligence', market)

  return (
    <section
      className="plexon-dash-band"
      data-section="collection-competitive-space"
      data-testid="collection-competitive-space-band"
      aria-label={t('projects.detail.competitiveSpaceTitle')}
    >
      <header className="plexon-dash-band-head">
        <div>
          <Text role="headline" as="h2">
            {t('projects.detail.competitiveSpaceTitle')}
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.competitiveSpaceSubtitle')}
          </Text>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpenWork('competitive')}>
          {t('projects.detail.competitiveSpaceOpenFacets')}
        </Button>
      </header>

      {loading ? <Spinner /> : null}
      {error ? <Text role="meta">{error}</Text> : null}

      {!loading && !error ? (
        <div className="plexon-capability-catalog">
          <div className="plexon-capability-catalog-block">
            <Text role="title" as="h4">
              {t('projects.detail.facetCompetitive')}
            </Text>
            {competitiveEmpty ? (
              <EmptyState>{t('projects.detail.competitiveSpaceEmptyCompetitive')}</EmptyState>
            ) : (
              <ul className="plexon-project-bindings">
                {(competitive?.competitors ?? []).slice(0, 6).map((c) => (
                  <li key={c.host} className="plexon-project-binding">
                    <div className="plexon-project-binding__main">
                      <Text role="title" as="h4">
                        {c.host}
                      </Text>
                      <Text role="meta">{c.label || competitive?.category || '—'}</Text>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="plexon-capability-catalog-block">
            <Text role="title" as="h4">
              {t('projects.detail.facetMarket')}
            </Text>
            {marketEmpty ? (
              <EmptyState>{t('projects.detail.competitiveSpaceEmptyMarket')}</EmptyState>
            ) : (
              <>
                {market?.summary ? <Text role="body">{market.summary}</Text> : null}
                {market?.topics?.length ? (
                  <Text role="meta">{market.topics.join(' · ')}</Text>
                ) : null}
              </>
            )}
          </div>

          <div className="plexon-capability-catalog-block">
            <Text role="title" as="h4">
              {t('projects.detail.competitiveSpaceAudience')}
            </Text>
            {!persona ? (
              <EmptyState>{t('projects.detail.competitiveSpaceEmptyAudience')}</EmptyState>
            ) : (
              <ul className="plexon-project-bindings">
                <li className="plexon-project-binding">
                  <div className="plexon-project-binding__main">
                    <Text role="title" as="h4">
                      {persona.name}
                    </Text>
                    <Text role="meta">{persona.role || 'AUDION'}</Text>
                  </div>
                  <NextLink href={personaHref}>
                    <Button variant="ghost" size="sm">
                      {t('projects.detail.personaPagesCta')}
                    </Button>
                  </NextLink>
                </li>
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
