'use client'

import type { KeyboardEvent } from 'react'
import { Chip, Panel, Text } from '@msqdx/ui'

export type PlexonEntityAccent = 'green' | 'pink' | 'orange' | 'purple' | 'yellow' | 'neutral'

export type PlexonEntityStat = {
  /** @deprecated Ignored — Material icon ligatures dropped in Wave 7. */
  icon?: string
  label: string
  brand?: PlexonEntityAccent
}

type PlexonEntityCardProps = {
  brandColor?: PlexonEntityAccent
  /** @deprecated Ignored — Material icon ligatures dropped in Wave 7. */
  icon?: string
  title: string
  subtitle?: string
  description?: string
  badge?: string
  stats?: PlexonEntityStat[]
  onClick?: () => void
}

/** Entity card — Panel + Text/Chip (no Material icons / cream paper). */
export function PlexonEntityCard({
  brandColor = 'neutral',
  title,
  subtitle,
  description,
  badge,
  stats = [],
  onClick,
}: PlexonEntityCardProps) {
  const interactive = Boolean(onClick)

  return (
    <Panel
      variant="card"
      data-plexon-assistant-ui
      className={[
        'plexon-assistant-entity-card',
        `is-${brandColor}`,
        interactive ? 'is-interactive' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e: KeyboardEvent<HTMLElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <div className="plexon-assistant-entity-head">
        <div className="plexon-assistant-entity-copy">
          <div className="plexon-assistant-entity-title-row">
            <Text role="title" as="h4" className="plexon-assistant-entity-title">
              {title}
            </Text>
            {badge ? (
              <Chip static size="sm" className={`plexon-assistant-entity-badge is-${brandColor}`}>
                {badge}
              </Chip>
            ) : null}
          </div>
          {subtitle ? (
            <Text role="meta" as="span" className="plexon-assistant-entity-subtitle">
              {subtitle}
            </Text>
          ) : null}
        </div>
      </div>
      {description ? (
        <Text role="body" as="p" className="plexon-assistant-entity-description">
          {description}
        </Text>
      ) : null}
      {stats.length > 0 ? (
        <div className="plexon-assistant-entity-stats">
          {stats.map((stat) => (
            <Chip
              key={stat.label}
              static
              size="sm"
              className={`plexon-assistant-entity-stat is-${stat.brand ?? brandColor}`}
            >
              {stat.label}
            </Chip>
          ))}
        </div>
      ) : null}
    </Panel>
  )
}
