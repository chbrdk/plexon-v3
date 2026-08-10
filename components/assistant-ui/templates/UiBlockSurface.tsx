'use client'

import type { ReactNode } from 'react'
import { Panel, Text } from '@msqdx/ui'
import type { UiAccent } from '@/lib/assistant/ui-visual'
import { UiBlockHeader } from '@/components/assistant-ui/molecules/UiBlockHeader'

type UiBlockSurfaceProps = {
  children: ReactNode
  title?: string
  /** Optional decorative hint (kept for API compat; not rendered as Material ligature). */
  icon?: string
  borderRadius?: string
  brandColor?: UiAccent
  accent?: UiAccent
  eyebrow?: string
  noPadding?: boolean
  infoTooltip?: string
  infoTooltipAriaLabel?: string
  className?: string
}

/** Theme-aware block shell — Panel + editorial header (no cream paper / MUI card). */
export function UiBlockSurface({
  children,
  title,
  eyebrow,
  noPadding = false,
  infoTooltip,
  infoTooltipAriaLabel,
  className,
}: UiBlockSurfaceProps) {
  return (
    <div data-plexon-assistant-ui className="plexon-assistant-block-surface">
      <Panel
        variant="default"
        className={['plexon-assistant-block-panel', noPadding ? 'is-flush' : '', className]
          .filter(Boolean)
          .join(' ')}
      >
        {title ? (
          <UiBlockHeader
            title={title}
            eyebrow={eyebrow}
            infoTooltip={infoTooltip}
            infoTooltipAriaLabel={infoTooltipAriaLabel}
          />
        ) : null}
        <div className="plexon-assistant-block-body">{children}</div>
      </Panel>
    </div>
  )
}
