'use client'

import Link from 'next/link'
import { Button, CardActions, CollectionHubCard, CollectionHubMetric } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  MetricIconPersonas,
  MetricIconScans,
  MetricIconTargetGroups,
} from '@/components/nav-icons'
import { pathPlatformProjectDashboard } from '@/lib/constants'
import type { CollectionProjectInsight } from '@/lib/collection-project-insight'
import { CollectionLifecycleActions } from '@/components/projects/CollectionLifecycleActions'

type CollectionProjectCardProps = {
  row: CollectionProjectInsight
  /** When set, show archive/restore controls. */
  onLifecycleChange?: () => void
}

/** Magazine tile for one Collection project — theme tokens only, no forced light surface. */
export function CollectionProjectCard({ row, onLifecycleChange }: CollectionProjectCardProps) {
  const { t } = useI18n()
  const pid = row.platformProject?.id ?? ''
  if (!pid) return null

  const canOpenPlatform = row.openPlatformProject !== false
  const name = row.platformProject.name ?? pid
  const domain = row.platformProject.domain?.trim() || null
  const checkionLinked = row.checkion != null
  const audionLinked = row.audion != null

  return (
    <CollectionHubCard
      kicker={domain ?? '\u00a0'}
      badge={
        !canOpenPlatform ? (
          <span title={t('dashboard.platformInsightsLegacyHint')}>
            {t('dashboard.platformInsightsLegacyBadge')}
          </span>
        ) : undefined
      }
      title={name}
      hint={!canOpenPlatform ? t('dashboard.platformInsightsLegacyHint') : undefined}
      stats={
        <div aria-label={t('dashboard.platformInsightsSubtitle')}>
          <CollectionHubMetric
            icon={<MetricIconScans />}
            value={checkionLinked ? String(row.checkion!.scanCount) : '—'}
            label={t('dashboard.platformInsightsScans')}
            linked={checkionLinked}
          />
          <CollectionHubMetric
            icon={<MetricIconTargetGroups />}
            value={audionLinked ? String(row.audion!.targetGroupCount ?? 0) : '—'}
            label={t('dashboard.platformInsightsTargetGroups')}
            linked={audionLinked}
          />
          <CollectionHubMetric
            icon={<MetricIconPersonas />}
            value={audionLinked ? String(row.audion!.personaCount) : '—'}
            label={t('dashboard.platformInsightsPersonas')}
            linked={audionLinked}
          />
        </div>
      }
      actions={
        <CardActions>
          {canOpenPlatform ? (
            <Link href={pathPlatformProjectDashboard(pid)}>
              <Button variant="ghost" size="md">
                {t('dashboard.platformInsightsOpenProject')}
              </Button>
            </Link>
          ) : null}
          {onLifecycleChange ? (
            <CollectionLifecycleActions
              platformProjectId={pid}
              status={row.platformProject.status}
              onChanged={onLifecycleChange}
              size="md"
            />
          ) : null}
          <a href={row.links.checkionProject} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="md">
              {t('dashboard.platformInsightsOpenCheckion')}
            </Button>
          </a>
          <a href={row.links.audionProject} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="md">
              {t('dashboard.platformInsightsOpenAudion')}
            </Button>
          </a>
        </CardActions>
      }
    />
  )
}
