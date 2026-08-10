'use client'

import { Text } from '@msqdx/ui'

type UiBlockHeaderProps = {
  title: string
  /** @deprecated Ignored — Material icon ligatures dropped in Wave 7. */
  icon?: string
  brand?: string
  eyebrow?: string
  infoTooltip?: string
  infoTooltipAriaLabel?: string
}

export function UiBlockHeader({
  title,
  eyebrow,
  infoTooltip,
  infoTooltipAriaLabel,
}: UiBlockHeaderProps) {
  return (
    <header className="plexon-assistant-block-header">
      <div className="plexon-assistant-block-header-copy">
        {eyebrow ? (
          <Text role="meta" as="span" className="plexon-assistant-block-eyebrow">
            {eyebrow}
          </Text>
        ) : null}
        <div className="plexon-assistant-block-title-row">
          <Text role="title" as="h3" className="plexon-assistant-block-title">
            {title}
          </Text>
          {infoTooltip ? (
            <span
              className="plexon-assistant-block-info"
              title={infoTooltip}
              aria-label={infoTooltipAriaLabel ?? `Info: ${title}`}
            >
              i
            </span>
          ) : null}
        </div>
      </div>
    </header>
  )
}
