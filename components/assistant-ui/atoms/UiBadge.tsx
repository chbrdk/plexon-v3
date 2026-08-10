'use client'

import { Chip } from '@msqdx/ui'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type UiBadgeProps = {
  label: string
  tone?: UiTone
}

export function UiBadge({ label, tone = 'neutral' }: UiBadgeProps) {
  return (
    <Chip static size="sm" className={`plexon-assistant-badge is-${tone}`}>
      {label}
    </Chip>
  )
}
