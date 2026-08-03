'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button, CardActions, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  MetricIconPersonas,
  MetricIconScans,
  MetricIconTargetGroups,
} from '@/components/nav-icons'
import { pathPlatformProjectDashboard } from '@/lib/constants'
import type { CollectionProjectInsight } from '@/lib/collection-project-insight'

type CollectionProjectCardProps = {
  row: CollectionProjectInsight
}

function Metric({
  icon,
  value,
  label,
  linked,
}: {
  icon: ReactNode
  value: string
  label: string
  linked: boolean
}) {
  return (
    <div className="plexon-collection-metric" data-linked={linked ? 'true' : 'false'}>
      <span className="plexon-collection-metric-icon" aria-hidden>
        {icon}
      </span>
      <span className="plexon-collection-metric-value">{value}</span>
      <span className="plexon-collection-metric-label">{label}</span>
    </div>
  )
}

/** Magazine tile for one Collection project — theme tokens only, no forced light surface. */
export function CollectionProjectCard({ row }: CollectionProjectCardProps) {
  const { t } = useI18n()
  const pid = row.platformProject?.id ?? ''
  if (!pid) return null

  const canOpenPlatform = row.openPlatformProject !== false
  const name = row.platformProject.name ?? pid
  const domain = row.platformProject.domain?.trim() || null
  const checkionLinked = row.checkion != null
  const audionLinked = row.audion != null

  return (
    <article className="plexon-collection-card">
      <header className="plexon-collection-card-head">
        <Text role="meta" as="p" className="plexon-collection-card-kicker">
          {domain ?? '\u00a0'}
        </Text>
        {!canOpenPlatform ? (
          <span className="plexon-collection-card-badge" title={t('dashboard.platformInsightsLegacyHint')}>
            {t('dashboard.platformInsightsLegacyBadge')}
          </span>
        ) : null}
      </header>

      <Text role="headline" as="h3" className="plexon-collection-card-title">
        {name}
      </Text>

      {!canOpenPlatform ? (
        <Text role="meta" as="p" className="plexon-collection-card-hint">
          {t('dashboard.platformInsightsLegacyHint')}
        </Text>
      ) : null}

      <div className="plexon-collection-card-stats" aria-label={t('dashboard.platformInsightsSubtitle')}>
        <Metric
          icon={<MetricIconScans />}
          value={checkionLinked ? String(row.checkion!.scanCount) : '—'}
          label={t('dashboard.platformInsightsScans')}
          linked={checkionLinked}
        />
        <Metric
          icon={<MetricIconTargetGroups />}
          value={audionLinked ? String(row.audion!.targetGroupCount ?? 0) : '—'}
          label={t('dashboard.platformInsightsTargetGroups')}
          linked={audionLinked}
        />
        <Metric
          icon={<MetricIconPersonas />}
          value={audionLinked ? String(row.audion!.personaCount) : '—'}
          label={t('dashboard.platformInsightsPersonas')}
          linked={audionLinked}
        />
      </div>

      <CardActions className="plexon-collection-card-actions">
        {canOpenPlatform ? (
          <Link href={pathPlatformProjectDashboard(pid)} className="plexon-collection-card-link">
            <Button variant="ghost" size="md">
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
          <Button variant="ghost" size="md">
            {t('dashboard.platformInsightsOpenCheckion')}
          </Button>
        </a>
        <a
          href={row.links.audionProject}
          target="_blank"
          rel="noopener noreferrer"
          className="plexon-collection-card-link"
        >
          <Button variant="ghost" size="md">
            {t('dashboard.platformInsightsOpenAudion')}
          </Button>
        </a>
      </CardActions>
    </article>
  )
}
