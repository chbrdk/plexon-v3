'use client'

import type { keyValueListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiKeyValueRow } from '@/components/assistant-ui/molecules/UiKeyValueRow'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof keyValueListPropsSchema>

export function UiKeyValueList({ title, items }: Props) {
  return (
    <UiBlockSurface title={title} eyebrow="details">
      <ul className="plexon-assistant-kv-list">
        {items.map((item, index) => (
          <li
            key={item.label}
            className={`plexon-assistant-list-item${index % 2 === 1 ? ' is-alt' : ''}`}
          >
            <UiKeyValueRow label={item.label} value={item.value} />
          </li>
        ))}
      </ul>
    </UiBlockSurface>
  )
}
