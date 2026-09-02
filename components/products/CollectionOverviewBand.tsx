'use client'

import NextLink from 'next/link'
import { Button, StatLede, StatLedeGroup, Text } from '@msqdx/ui'
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
  BrandionProjectSummary,
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
  brandion: BrandionProjectSummary | null
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
    case 'market_intelligence':
      return 'projects.detail.knowledgeFacetMarket'
    case 'brand':
      return 'projects.detail.knowledgeFacetBrand'
    case 'sources':
      return 'projects.detail.knowledgeFacetSources'
  }
}

function topScans(checkion: CheckionProjectSummary | null) {
  if (!checkion) return []
  const domain = checkion.domainScans.map((s) => ({
    key: `d-${s.id}`,
    label: s.domain,
    score: s.score,
  }))
  const pages = checkion.standaloneScans.map((s) => ({
    key: `s-${s.id}`,
    label: s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    score: s.score,
  }))
  return [...domain, ...pages].sort((a, b) => b.score - a.score).slice(0, 2)
}

function productLabel(productId: string): string {
  if (productId === 'checkion') return 'CHECKION'
  if (productId === 'audion') return 'AUDION'
  if (productId === 'brandion') return 'BRANDION'
  return productId
}

function syncShort(status: string): string {
  const s = status.toLowerCase()
  if (s === 'synced' || s === 'ok' || s === 'healthy' || s === 'in_sync') return 'ok'
  if (s === 'pending' || s === 'syncing') return '…'
  if (s === 'error' || s === 'failed') return 'err'
  return status
}

function flowStatusLabel(status: string | null, neverRun: string): { text: string; tone: 'ok' | 'err' | 'muted' } {
  if (!status) return { text: neverRun, tone: 'muted' }
  const s = status.toLowerCase()
  if (s === 'complete' || s === 'completed') return { text: 'ok', tone: 'ok' }
  if (s === 'error' || s === 'failed') return { text: 'err', tone: 'err' }
  if (s === 'running' || s === 'pending') return { text: s, tone: 'muted' }
  return { text: status, tone: 'muted' }
}

export function CollectionOverviewBand({
  platformProjectId,
  domain,
  checkion,
  audion,
  brandion,
  bindings,
  knowledge,
  flows,
  onOpenWork,
}: Props) {
  const { t } = useI18n()
  const scans = topScans(checkion)
  const personas = (audion?.personas ?? []).slice(0, 3)
  const guidelines = (brandion?.guidelines ?? []).slice(0, 3)
  const facets = (knowledge?.facets ?? []).filter((f) => f.status !== 'reserved')
  const filledCount = facets.filter((f) => f.status === 'filled').length
  const facetTotal = facets.length
  const flowCount = flows?.count ?? 0
  const bindingsOk = bindings.filter((b) => {
    const s = b.syncStatus.toLowerCase()
    return s === 'synced' || s === 'ok' || s === 'healthy' || s === 'in_sync'
  }).length

  const lede = domain
    ? t('projects.detail.overviewLedeWithDomain', { domain })
    : t('projects.detail.overviewLede')

  return (
    <section
      className="plexon-dash-band plexon-collection-overview"
      aria-label={t('projects.detail.overviewTitle')}
      data-section="collection-overview"
    >
      <header className="plexon-collection-overview-mast">
        <div className="plexon-collection-overview-mast-copy">
          <Text role="meta" as="p" className="plexon-collection-overview-kicker">
            {t('projects.detail.overviewTitle')}
          </Text>
          <Text role="body" as="p" className="plexon-collection-overview-lede">
            {lede}
          </Text>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpenWork('profile')}>
          {t('projects.detail.overviewEditKnowledge')}
        </Button>
      </header>

      <StatLedeGroup
        aria-label={t('projects.detail.overviewPulse')}
        columns={5}
        compact
        className="plexon-collection-overview-pulse"
      >
        <StatLede
          label={t('projects.detail.scans')}
          value={checkion ? String(checkion.scanCount) : '—'}
        />
        <StatLede
          label={t('projects.detail.personas')}
          value={audion ? String(audion.personaCount) : '—'}
        />
        <StatLede
          label={t('projects.detail.guidelines')}
          value={brandion ? String(brandion.guidelineCount) : '—'}
        />
        <StatLede
          label={t('projects.detail.overviewKnowledgePulse')}
          value={facetTotal > 0 ? `${filledCount}/${facetTotal}` : '—'}
        />
        <StatLede
          label={t('projects.detail.overviewFlowsCount')}
          value={String(flowCount)}
        />
      </StatLedeGroup>

      <div className="plexon-collection-overview-folio">
        <article className="plexon-collection-overview-chapter" data-chapter="capabilities">
          <div className="plexon-collection-overview-chapter-block">
            <header className="plexon-collection-overview-chapter-head">
              <Text role="meta" as="p" className="plexon-collection-overview-kicker">
                CHECKION
              </Text>
              <Button variant="link" size="sm" onClick={() => onOpenWork('checkion')}>
                {t('projects.detail.overviewOpenCatalog')}
              </Button>
            </header>
            {!checkion ? (
              <Text role="meta">{t('projects.detail.overviewCheckionEmpty')}</Text>
            ) : scans.length === 0 ? (
              <Text role="meta">{t('projects.detail.overviewCheckionNoScans')}</Text>
            ) : (
              <ul className="plexon-collection-overview-ledger">
                {scans.map((s) => (
                  <li key={s.key}>
                    <span className="plexon-collection-overview-ledger-label">{s.label}</span>
                    <span className="plexon-collection-overview-ledger-mark">{s.score}</span>
                  </li>
                ))}
              </ul>
            )}
            {checkion ? (
              <Text role="meta" as="p" className="plexon-collection-overview-aside">
                {checkion.domainScanCount} {t('projects.detail.domainScans')} ·{' '}
                {checkion.standaloneScanCount} {t('projects.detail.standaloneScans')}
              </Text>
            ) : null}
          </div>

          <div className="plexon-collection-overview-chapter-block">
            <header className="plexon-collection-overview-chapter-head">
              <Text role="meta" as="p" className="plexon-collection-overview-kicker">
                AUDION
              </Text>
              <Button variant="link" size="sm" onClick={() => onOpenWork('audion')}>
                {t('projects.detail.overviewOpenCatalog')}
              </Button>
            </header>
            {!audion ? (
              <Text role="meta">{t('projects.detail.overviewAudionEmpty')}</Text>
            ) : personas.length === 0 ? (
              <Text role="meta">{t('projects.detail.overviewAudionNoPersonas')}</Text>
            ) : (
              <ul className="plexon-collection-overview-ledger">
                {personas.map((p) => (
                  <li key={p.id}>
                    <span className="plexon-collection-overview-ledger-label">{p.name}</span>
                    <span className="plexon-collection-overview-ledger-mark">{p.role}</span>
                  </li>
                ))}
              </ul>
            )}
            {audion ? (
              <Text role="meta" as="p" className="plexon-collection-overview-aside">
                {audion.targetGroupCount} {t('projects.detail.targetGroups')} ·{' '}
                {audion.journeyCount} {t('projects.detail.journeys')} ·{' '}
                {audion.studyCount} {t('projects.detail.studies')}
              </Text>
            ) : null}
          </div>

          <div className="plexon-collection-overview-chapter-block">
            <header className="plexon-collection-overview-chapter-head">
              <Text role="meta" as="p" className="plexon-collection-overview-kicker">
                BRANDION
              </Text>
              <Button variant="link" size="sm" onClick={() => onOpenWork('brandion')}>
                {t('projects.detail.overviewOpenCatalog')}
              </Button>
            </header>
            {!brandion ? (
              <Text role="meta">{t('projects.detail.overviewBrandionEmpty')}</Text>
            ) : guidelines.length === 0 ? (
              <Text role="meta">{t('projects.detail.overviewBrandionNoGuidelines')}</Text>
            ) : (
              <ul className="plexon-collection-overview-ledger">
                {guidelines.map((g) => (
                  <li key={g.id}>
                    <span className="plexon-collection-overview-ledger-label">{g.name}</span>
                    <span className="plexon-collection-overview-ledger-mark">{g.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {brandion ? (
              <Text role="meta" as="p" className="plexon-collection-overview-aside">
                {brandion.guidelineCount} {t('projects.detail.guidelines')} ·{' '}
                {brandion.analysisCount} {t('projects.detail.analyses')}
              </Text>
            ) : null}
          </div>
        </article>

        <article className="plexon-collection-overview-chapter" data-chapter="readiness">
          <div className="plexon-collection-overview-chapter-block">
            <header className="plexon-collection-overview-chapter-head">
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
            {facets.length === 0 ? (
              <Text role="meta">{t('projects.detail.overviewKnowledgePending')}</Text>
            ) : (
              <ul className="plexon-collection-overview-ledger">
                {facets.map((f: KnowledgeFacetReadiness) => (
                  <li key={f.facetId}>
                    <button
                      type="button"
                      className="plexon-collection-overview-ledger-btn"
                      onClick={() => onOpenWork(f.facetId)}
                    >
                      <span className="plexon-collection-overview-ledger-label">
                        {t(facetLabelKey(f.facetId))}
                      </span>
                      <span
                        className="plexon-collection-overview-ledger-mark"
                        data-tone={f.status === 'filled' ? 'ok' : 'muted'}
                      >
                        {f.status === 'filled'
                          ? t('projects.detail.overviewFacetFilled')
                          : t('projects.detail.overviewFacetEmpty')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="plexon-collection-overview-chapter-block">
            <header className="plexon-collection-overview-chapter-head">
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
              <ul className="plexon-collection-overview-ledger">
                {flows.recent.map((f) => {
                  const st = flowStatusLabel(
                    f.lastRunStatus,
                    t('projects.detail.overviewFlowNeverRun'),
                  )
                  return (
                    <li key={f.id}>
                      <span className="plexon-collection-overview-ledger-label">{f.name}</span>
                      <span
                        className="plexon-collection-overview-ledger-mark"
                        data-tone={st.tone}
                      >
                        {st.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </article>
      </div>

      <footer className="plexon-collection-overview-foot">
        <button
          type="button"
          className="plexon-collection-overview-foot-link"
          onClick={() => onOpenWork('bindings')}
        >
          {t('projects.detail.navBindings')}
        </button>
        <span className="plexon-collection-overview-foot-sep" aria-hidden>
          ·
        </span>
        {bindings.length === 0 ? (
          <Text role="meta" as="span">
            {t('projects.detail.bindingsEmpty')}
          </Text>
        ) : (
          <>
            <Text role="meta" as="span">
              {bindingsOk}/{bindings.length} {t('projects.detail.overviewLinksSynced')}
            </Text>
            {bindings.map((b) => (
              <span key={b.productId} className="plexon-collection-overview-foot-chip">
                {productLabel(b.productId)} {syncShort(b.syncStatus)}
              </span>
            ))}
          </>
        )}
      </footer>
    </section>
  )
}
