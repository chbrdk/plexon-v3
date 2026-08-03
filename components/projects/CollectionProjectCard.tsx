'use client'

import Link from 'next/link'
import { Button, Chip, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { pathPlatformProjectDashboard } from '@/lib/constants'
import type { CollectionProjectInsight } from '@/lib/collection-project-insight'

type CollectionProjectCardProps = {
  row: CollectionProjectInsight
}

/** Magazine tile for one Collection project — theme tokens only, no forced light surface. */
export function CollectionProjectCard({ row }: CollectionProjectCardProps) {
  const { t } = useI18n()
  const pid = row.platformProject?.id ?? ''
  if (!pid) return null

  const canOpenPlatform = row.openPlatformProject !== false
  const name = row.platformProject.name ?? pid
  const domain = row.platformProject.domain?.trim() || null

  const checkionLabel =
    row.checkion != null
      ? `${t('dashboard.platformInsightsCapabilityCheckion')} · ${row.checkion.scanCount} ${t('dashboard.platformInsightsScans')}`
      : `${t('dashboard.platformInsightsCapabilityCheckion')} · ${t('dashboard.platformInsightsNoProduct')}`

  const audionLabel =
    row.audion != null
      ? `${t('dashboard.platformInsightsCapabilityAudion')} · ${row.audion.targetGroupCount ?? 0} ${t('dashboard.platformInsightsTargetGroups')} · ${row.audion.personaCount} ${t('dashboard.platformInsightsPersonas')}`
      : `${t('dashboard.platformInsightsCapabilityAudion')} · ${t('dashboard.platformInsightsNoProduct')}`

  return (
    <article className="plexon-collection-card">
      <header className="plexon-collection-card-head">
        <Text role="meta" as="p" className="plexon-collection-card-kicker">
          {domain ?? t('dashboard.platformInsightsSubtitle')}
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

      <ul className="plexon-collection-card-meta" aria-label={t('dashboard.platformInsightsSubtitle')}>
        <li>
          <Chip static size="sm" selected={row.checkion != null}>
            {checkionLabel}
          </Chip>
        </li>
        <li>
          <Chip static size="sm" selected={row.audion != null}>
            {audionLabel}
          </Chip>
        </li>
      </ul>

      <div className="plexon-collection-card-actions">
        {canOpenPlatform ? (
          <Link href={pathPlatformProjectDashboard(pid)} className="plexon-collection-card-link">
            <Button variant="ghost" size="sm">
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
    </article>
  )
}
