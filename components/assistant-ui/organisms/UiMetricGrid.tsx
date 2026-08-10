'use client'

import type { metricGridPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import type { UiAccent } from '@/lib/assistant/ui-visual'
import { UiMetricTile } from '@/components/assistant-ui/molecules/UiMetricTile'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof metricGridPropsSchema> & {
  accent?: UiAccent
}

export function UiMetricGrid({ title, items, accent = 'theme' }: Props) {
  return (
    <UiBlockSurface
      title={title}
      eyebrow="metrics"
      className={`plexon-assistant-metric-grid is-accent-${accent}`}
    >
      <div className="plexon-assistant-metric-grid-items">
        {items.map((item) => (
          <UiMetricTile key={`${item.label}-${item.value}`} item={item} />
        ))}
      </div>
    </UiBlockSurface>
  )
}
