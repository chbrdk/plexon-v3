'use client'

import { ChatBlockPanel, ChatMetricGrid } from '@msqdx/ui'
import type { metricGridPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import type { UiAccent } from '@/lib/assistant/ui-visual'

type Props = z.infer<typeof metricGridPropsSchema> & {
  accent?: UiAccent
}

/** Generative `metric_grid` — shared ChatMetricGrid chrome. */
export function UiMetricGrid({ title, items, accent = 'theme' }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel
        title={title}
        eyebrow="metrics"
        className={`plexon-assistant-metric-grid is-accent-${accent}`}
      >
        <ChatMetricGrid items={items} />
      </ChatBlockPanel>
    </div>
  )
}
