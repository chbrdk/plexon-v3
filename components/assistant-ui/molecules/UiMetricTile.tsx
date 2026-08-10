'use client'

import { Panel } from '@msqdx/ui'
import type { metricGridPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiBadge } from '@/components/assistant-ui/atoms/UiBadge'
import { UiMetricValue } from '@/components/assistant-ui/atoms/UiMetricValue'
import { UiText } from '@/components/assistant-ui/atoms/UiText'

type MetricItem = z.infer<typeof metricGridPropsSchema>['items'][number]

type UiMetricTileProps = {
  item: MetricItem
}

export function UiMetricTile({ item }: UiMetricTileProps) {
  const tone = item.tone ?? 'neutral'

  return (
    <Panel
      variant="card"
      className={`plexon-assistant-metric-tile is-${tone}`}
      data-plexon-assistant-ui
    >
      <div className="plexon-assistant-metric-tile-body">
        <UiText variant="caption" role="label" tone="neutral">
          {item.label}
        </UiText>
        <UiMetricValue value={item.value} unit={item.unit} />
        {item.tone && item.tone !== 'neutral' ? <UiBadge label={item.tone} tone={item.tone} /> : null}
        {item.hint ? (
          <UiText variant="caption" className="plexon-assistant-metric-hint">
            {item.hint}
          </UiText>
        ) : null}
      </div>
    </Panel>
  )
}
