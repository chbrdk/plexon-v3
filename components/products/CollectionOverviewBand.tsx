'use client'

import NextLink from 'next/link'
import { Button, Chip, StatLede, StatLedeGroup, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { CollectionWorkNavId } from '@/components/products/CollectionKnowledgeBand'
import type { CollectionBinding } from '@/components/products/CollectionCapabilityViews'
import { pathPlatformProjectFlows } from '@/lib/constants'
import type {
  KnowledgeFacetId,
  KnowledgeFacetReadiness,
} from '@/lib/collection-knowledge-pack'
import type {
  AudionProjectSummary,
  CheckionProjectSummary,
} from '@/lib/platform-project-dashboard-fetch'

export type DashboardFlowsSummary = {
  count: number
  recent: Array<{
    id: string
    name: string
    updatedAt: string
    lastRunStatus: string | null
  }>
}

export type DashboardKnowledgeSummary = {
  revision: number
  facets: KnowledgeFacetReadiness[]
}

type Props = {
  platformProjectId: string
  domain: string | null
  checkion: CheckionProjectSummary | null
  audion: AudionProjectSummary | null
  bindings: CollectionBinding[]
  knowledge: DashboardKnowledgeSummary | null
  flows: DashboardFlowsSummary | null
  onOpenWork: (id: CollectionWorkNavId) => void
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

function readinessClass(status: KnowledgeFacetReadiness['status']): string {
  if (status === 'filled') return 'plexon-overview-chip plexon-overview-chip--filled'
  if (status === 'reserved') return 'plexon-overview-chip plexon-overview-chip--reserved'
  return 'plexon-overview-chip plexon-overview-chip--empty'
}

function syncClass(status: string): string {
  return `plexon-sync-chip plexon-sync-chip--${syncTone(status)}`
}

function topScans(checkion: CheckionProjectSummary | null) {
  if (!checkion) return []
  const domain = checkion.domainScans.map((s) => ({
    key: `d-${s.id}`,
    label: s.domain,
    score: s.score,
    kind: 'domain' as const,
  }))
  const pages = checkion.standaloneScans.map((s) => ({
    key: `s-${s.id}`,
    label: s.url,
    score: s.score,
    kind: 'page' as const,
  }))
  return [...domain, ...pages]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
}

function syncTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase()
  if (s === 'synced' || s === 'ok' || s === 'healthy' || s === 'in_sync') return 'success'
  if (s === 'pending' || s === 'syncing') return 'warning'
  if (s === 'error' || s === 'failed') return 'danger'
  return 'neutral'
}

function productLabel(productId: string): string {
  if (productId === 'checkion') return 'CHECKION'
  if (productId === 'audion') return 'AUDION'
  return productId
}

export function CollectionOverviewBand({
  platformProjectId,
  domain,
  checkion,
  audion,
  bindings,
  knowledge,
  flows,
  onOpenWork,
}: Props) {
  const { t } = useI18n()
  const scans = topScans(checkion)
  const personas = (audion?.personas ?? []).slice(0, 3)
  const filledCount = knowledge?.facets.filter((f) => f.status === 'filled').length ?? 0
  const facetTotal = knowledge?.facets.filter((f) => f.status !== 'reserved').length ?? 0

  const lede = domain
    ? t('projects.detail.overviewLedeWithDomain', { domain })
    : t('projects.detail.overviewLede')

  return (
    <section
      className="plexon-dash-band plexon-collection-overview"
      aria-label={t('projects.detail.overviewTitle')}
      data-section="collection-overview"
    >
      <header className="plexon-dash-band-head plexon-collection-overview-head">
        <div>
          <Text role="title" as="h2" className="plexon-dash-band-title">
            {t('projects.detail.overviewTitle')}
          </Text>
          <Text role="meta" as="p" className="plexon-dash-band-deck">
            {lede}
          </Text>
        </div>
        <div className="plexon-collection-overview-actions">
          <Button variant="ghost" size="sm" onClick={() => onOpenWork('profile')}>
            {t('projects.detail.overviewEditKnowledge')}
          </Button>
        </div>
      </header>

      <div className="plexon-collection-overview-spreads">
        <article className="plexon-collection-overview-spread" data-spread="checkion">
          <header className="plexon-collection-overview-spread-head">
            <Text role="meta" as="p" className="plexon-collection-overview-kicker">
              CHECKION
            </Text>
            <Button variant="link" size="sm" onClick={() => onOpenWork('checkion')}>
              {t('projects.detail.overviewOpenCatalog')}
            </Button>
          </header>
          {!checkion ? (
            <Text role="meta">{t('projects.detail.overviewCheckionEmpty')}</Text>
          ) : (
            <>
              <StatLedeGroup aria-label={t('projects.detail.overviewCheckionStats')}>
                <StatLede
                  label={t('projects.detail.scans')}
                  value={String(checkion.scanCount)}
                />
                <StatLede
                  label={t('projects.detail.domainScans')}
                  value={String(checkion.domainScanCount)}
                />
                <StatLede
                  label={t('projects.detail.standaloneScans')}
                  value={String(checkion.standaloneScanCount)}
                />
              </StatLedeGroup>
              {scans.length === 0 ? (
                <Text role="meta">{t('projects.detail.overviewCheckionNoScans')}</Text>
              ) : (
                <ul className="plexon-collection-overview-teasers">
                  {scans.map((s) => (
                    <li key={s.key}>
                      <Text role="body" as="span">
                        {s.label}
                      </Text>
                      <Text role="meta" as="span">
                        {s.score}
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </article>

        <article className="plexon-collection-overview-spread" data-spread="audion">
          <header className="plexon-collection-overview-spread-head">
            <Text role="meta" as="p" className="plexon-collection-overview-kicker">
              AUDION
            </Text>
            <Button variant="link" size="sm" onClick={() => onOpenWork('audion')}>
              {t('projects.detail.overviewOpenCatalog')}
            </Button>
          </header>
          {!audion ? (
            <Text role="meta">{t('projects.detail.overviewAudionEmpty')}</Text>
          ) : (
            <>
              <StatLedeGroup aria-label={t('projects.detail.overviewAudionStats')}>
                <StatLede
                  label={t('projects.detail.personas')}
                  value={String(audion.personaCount)}
                />
                <StatLede
                  label={t('projects.detail.targetGroups')}
                  value={String(audion.targetGroupCount)}
                />
                <StatLede
                  label={t('projects.detail.journeys')}
                  value={String(audion.journeyCount)}
                />
                <StatLede
                  label={t('projects.detail.studies')}
                  value={String(audion.studyCount)}
                />
              </StatLedeGroup>
              {personas.length === 0 ? (
                <Text role="meta">{t('projects.detail.overviewAudionNoPersonas')}</Text>
              ) : (
                <ul className="plexon-collection-overview-teasers">
                  {personas.map((p) => (
                    <li key={p.id}>
                      <Text role="body" as="span">
                        {p.name}
                      </Text>
                      <Text role="meta" as="span">
                        {p.role}
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </article>

        <article className="plexon-collection-overview-spread" data-spread="knowledge">
          <header className="plexon-collection-overview-spread-head">
            <Text role="meta" as="p" className="plexon-collection-overview-kicker">
              {t('projects.detail.overviewKnowledgeTitle')}
            </Text>
            <Text role="meta" as="p">
              {facetTotal > 0
                ? t('projects.detail.overviewKnowledgeReady', {
                    filled: filledCount,
                    total: facetTotal,
                  })
                : t('projects.detail.overviewKnowledgePending')}
            </Text>
          </header>
          {!knowledge?.facets.length ? (
            <Text role="meta">{t('projects.detail.overviewKnowledgePending')}</Text>
          ) : (
            <ul className="plexon-collection-overview-facet-chips">
              {knowledge.facets.map((f) => (
                <li key={f.facetId}>
                  <button
                    type="button"
                    className="plexon-collection-overview-facet-btn"
                    onClick={() => onOpenWork(f.facetId)}
                    disabled={f.status === 'reserved'}
                  >
                    <Chip static size="sm" className={readinessClass(f.status)}>
                      {t(facetLabelKey(f.facetId))}
                      {' · '}
                      {f.status === 'filled'
                        ? t('projects.detail.overviewFacetFilled')
                        : f.status === 'reserved'
                          ? t('projects.detail.overviewFacetReserved')
                          : t('projects.detail.overviewFacetEmpty')}
                    </Chip>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="plexon-collection-overview-spread" data-spread="flows">
          <header className="plexon-collection-overview-spread-head">
            <Text role="meta" as="p" className="plexon-collection-overview-kicker">
              {t('projects.detail.navFlows')}
            </Text>
            <NextLink href={pathPlatformProjectFlows(platformProjectId)}>
              <Button variant="link" size="sm">
                {t('projects.detail.overviewOpenFlows')}
              </Button>
            </NextLink>
          </header>
          {!flows || flows.count === 0 ? (
            <Text role="meta">{t('projects.detail.overviewFlowsEmpty')}</Text>
          ) : (
            <>
              <StatLedeGroup aria-label={t('projects.detail.navFlows')}>
                <StatLede label={t('projects.detail.overviewFlowsCount')} value={String(flows.count)} />
              </StatLedeGroup>
              <ul className="plexon-collection-overview-teasers">
                {flows.recent.map((f) => (
                  <li key={f.id}>
                    <Text role="body" as="span">
                      {f.name}
                    </Text>
                    <Text role="meta" as="span">
                      {f.lastRunStatus ?? t('projects.detail.overviewFlowNeverRun')}
                    </Text>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <article className="plexon-collection-overview-spread" data-spread="links">
          <header className="plexon-collection-overview-spread-head">
            <Text role="meta" as="p" className="plexon-collection-overview-kicker">
              {t('projects.detail.navBindings')}
            </Text>
            <Button variant="link" size="sm" onClick={() => onOpenWork('bindings')}>
              {t('projects.detail.overviewOpenCatalog')}
            </Button>
          </header>
          {bindings.length === 0 ? (
            <Text role="meta">{t('projects.detail.bindingsEmpty')}</Text>
          ) : (
            <ul className="plexon-collection-overview-bindings">
              {bindings.map((b) => (
                <li key={b.productId}>
                  <Chip static size="sm" className={syncClass(b.syncStatus)}>
                    {productLabel(b.productId)} · {b.syncStatus}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  )
}
