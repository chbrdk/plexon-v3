'use client'

import Link from 'next/link'
import { Button, Panel, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { pathPlatformProjectDashboard } from '@/lib/constants'
import type { CollectionProjectInsight } from '@/lib/collection-project-insight'

type CollectionProjectCardProps = {
  row: CollectionProjectInsight
}

/** One Collection card — same look as dashboard insights. */
export function CollectionProjectCard({ row }: CollectionProjectCardProps) {
  const { t } = useI18n()
  const pid = row.platformProject?.id ?? ''
  if (!pid) return null

  const canOpenPlatform = row.openPlatformProject !== false
  const name = row.platformProject.name ?? pid

  return (
    <Panel className="plexon-collection-card" data-msqdx-surface="light">
      <div className="plexon-collection-card-head">
        <Text role="title" as="h3" className="plexon-collection-card-title">
          {name}
        </Text>
        {!canOpenPlatform ? (
          <span className="plexon-collection-card-badge" title={t('dashboard.platformInsightsLegacyHint')}>
            {t('dashboard.platformInsightsLegacyBadge')}
          </span>
        ) : null}
      </div>

      {row.platformProject.domain ? (
        <Text role="meta" as="p" className="plexon-collection-card-domain">
          {row.platformProject.domain}
        </Text>
      ) : (
        <div className="plexon-collection-card-domain-spacer" />
      )}

      {!canOpenPlatform ? (
        <Text role="meta" as="p">
          {t('dashboard.platformInsightsLegacyHint')}
        </Text>
      ) : null}

      <div className="plexon-project-capability-strip" aria-label={t('dashboard.platformInsightsSubtitle')}>
        <span className="plexon-capability-chip" data-state={row.checkion != null ? 'on' : 'off'}>
          {t('dashboard.platformInsightsCapabilityCheckion')}
          {row.checkion != null
            ? ` · ${row.checkion.scanCount} ${t('dashboard.platformInsightsScans')}`
            : ` · ${t('dashboard.platformInsightsNoProduct')}`}
        </span>
        <span className="plexon-capability-chip" data-state={row.audion != null ? 'on' : 'off'}>
          {t('dashboard.platformInsightsCapabilityAudion')}
          {row.audion != null
            ? ` · ${row.audion.targetGroupCount ?? 0} ${t('dashboard.platformInsightsTargetGroups')} · ${row.audion.personaCount} ${t('dashboard.platformInsightsPersonas')}`
            : ` · ${t('dashboard.platformInsightsNoProduct')}`}
        </span>
      </div>

      <div className="plexon-collection-card-actions">
        {canOpenPlatform ? (
          <Link href={pathPlatformProjectDashboard(pid)} className="plexon-collection-card-link">
            <Button variant="primary" size="sm">
              {t('dashboard.platformInsightsOpenProject')}
            </Button>
          </Link>
        ) : null}
        <a
          href={row.links.checkionProject}
          target="_blank"
          rel="noopener noreferrer"
          className="plexon-collection-card-link"
        >
          <Button variant="ghost" size="sm">
            {t('dashboard.platformInsightsOpenCheckion')}
          </Button>
        </a>
        <a
          href={row.links.audionProject}
          target="_blank"
          rel="noopener noreferrer"
          className="plexon-collection-card-link"
        >
          <Button variant="ghost" size="sm">
            {t('dashboard.platformInsightsOpenAudion')}
          </Button>
        </a>
      </div>
    </Panel>
  )
}
