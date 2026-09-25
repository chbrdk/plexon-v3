'use client'

/**
 * Collection activity band (Enterprise E1).
 * Destillate: flow runs + product activity items + capability binding pulse.
 */

import NextLink from 'next/link'
import { Button, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { pathPlatformProjectFlow, pathPlatformProjectFlows } from '@/lib/constants'
import type { CollectionBinding } from '@/components/products/CollectionCapabilityViews'
import type { DashboardFlowsSummary } from '@/components/products/CollectionOverviewBand'
import type { CollectionWorkNavId } from '@/components/products/CollectionKnowledgeBand'

export type DashboardActivityItem = {
  id: string
  at: string
  productId: string
  kind: string
  status: string
  subjectRef: string
  title: string
  href: string | null
}

type Props = {
  platformProjectId: string
  flows: DashboardFlowsSummary | null
  bindings: CollectionBinding[]
  activityItems?: DashboardActivityItem[]
  onOpenWork: (id: CollectionWorkNavId) => void
}

function productLabel(productId: string): string {
  const map: Record<string, string> = {
    checkion: 'CHECKION',
    audion: 'AUDION',
    brandion: 'BRANDION',
    creation: 'CREATION',
    metron: 'METRON',
    videon: 'VIDEON',
    spirion: 'SPIRION',
    echon: 'ECHON',
  }
  return map[productId] ?? productId
}

function syncOk(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'synced' || s === 'ok' || s === 'healthy' || s === 'in_sync'
}

function capabilityNavId(productId: string): CollectionWorkNavId {
  switch (productId) {
    case 'checkion':
    case 'audion':
    case 'brandion':
    case 'creation':
    case 'metron':
    case 'videon':
    case 'spirion':
    case 'echon':
      return productId
    default:
      return 'bindings'
  }
}

export function CollectionActivityBand({
  platformProjectId,
  flows,
  bindings,
  activityItems = [],
  onOpenWork,
}: Props) {
  const { t } = useI18n()
  const recent = flows?.recent ?? []
  const linked = bindings.filter((b) => b.externalProjectId)

  return (
    <section
      className="plexon-dash-band"
      data-section="collection-activity"
      data-testid="collection-activity-band"
      aria-label={t('projects.detail.activityTitle')}
    >
      <header className="plexon-dash-band-head">
        <div>
          <Text role="headline" as="h2">
            {t('projects.detail.activityTitle')}
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.activitySubtitle')}
          </Text>
        </div>
        <NextLink href={pathPlatformProjectFlows(platformProjectId)}>
          <Button variant="ghost" size="sm">
            {t('projects.detail.overviewOpenFlows')}
          </Button>
        </NextLink>
      </header>

      <div className="plexon-capability-catalog">
        {activityItems.length > 0 ? (
          <div className="plexon-capability-catalog-block">
            <Text role="title" as="h4">
              Destillate
            </Text>
            <ul className="plexon-project-bindings">
              {activityItems.slice(0, 8).map((item) => (
                <li key={item.id} className="plexon-project-binding">
                  <div className="plexon-project-binding__main">
                    <Text role="title" as="h4">
                      {item.title}
                    </Text>
                    <Text role="meta">
                      {productLabel(item.productId)} · {item.status} ·{' '}
                      {new Date(item.at).toLocaleString()}
                    </Text>
                  </div>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">
                        {t('projects.detail.overviewOpenCatalog')}
                      </Button>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="plexon-capability-catalog-block">
          <Text role="title" as="h4">
            {t('projects.detail.activityFlows')}
          </Text>
          {recent.length === 0 ? (
            <Text role="meta">{t('projects.detail.overviewFlowsEmpty')}</Text>
          ) : (
            <ul className="plexon-project-bindings">
              {recent.map((flow) => (
                <li key={flow.id} className="plexon-project-binding">
                  <div className="plexon-project-binding__main">
                    <Text role="title" as="h4">
                      {flow.name}
                    </Text>
                    <Text role="meta">
                      {flow.lastRunStatus ?? t('projects.detail.overviewFlowNeverRun')} ·{' '}
                      {new Date(flow.updatedAt).toLocaleString()}
                    </Text>
                  </div>
                  <NextLink href={pathPlatformProjectFlow(platformProjectId, flow.id)}>
                    <Button variant="ghost" size="sm">
                      {t('projects.detail.overviewOpenCatalog')}
                    </Button>
                  </NextLink>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="plexon-capability-catalog-block">
          <Text role="title" as="h4">
            {t('projects.detail.activityCapabilities')}
          </Text>
          {linked.length === 0 ? (
            <Text role="meta">{t('projects.detail.activityCapabilitiesEmpty')}</Text>
          ) : (
            <ul className="plexon-project-bindings">
              {linked.map((b) => (
                <li key={b.productId} className="plexon-project-binding">
                  <div className="plexon-project-binding__main">
                    <Text role="title" as="h4">
                      {productLabel(b.productId)}
                    </Text>
                    <Text role="meta">
                      {syncOk(b.syncStatus) ? t('projects.detail.linked') : b.syncStatus}
                      {b.syncMessage ? ` · ${b.syncMessage}` : ''}
                    </Text>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenWork(capabilityNavId(b.productId))}
                  >
                    {t('projects.detail.overviewOpenCatalog')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
