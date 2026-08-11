'use client'

import { ChatBlockPanel, Chip, SwatchStrip, Text } from '@msqdx/ui'
import type { findingListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type Props = z.infer<typeof findingListPropsSchema> & {
  showSeverityBadge?: boolean
}

function severityLabel(severity: UiTone | undefined): string | null {
  switch (severity) {
    case 'error':
      return 'Kritisch'
    case 'warning':
      return 'Warnung'
    case 'success':
      return 'Positiv'
    case 'info':
      return 'Hinweis'
    default:
      return null
  }
}

function resolveSwatches(item: {
  hex?: string
  swatches?: string[]
}): string[] {
  const fromList = (item.swatches ?? []).filter(Boolean)
  if (fromList.length > 0) return fromList
  if (item.hex) return [item.hex]
  return []
}

/** Generative `finding_list` — findings with optional brand color swatches. */
export function UiFindingList({ title, items, showSeverityBadge = true }: Props) {
  return (
    <div data-plexon-assistant-ui data-testid="ui-finding-list">
      <ChatBlockPanel title={title ?? 'Erkenntnisse'} eyebrow="findings">
        <ul className="plexon-ui-finding-list">
          {items.map((item, index) => {
            const tone = item.severity ?? 'neutral'
            const badge = showSeverityBadge ? severityLabel(item.severity) : null
            const swatches = resolveSwatches(item)
            return (
              <li
                key={`${item.title}-${index}`}
                className={[
                  'plexon-ui-finding-list__item',
                  index % 2 === 1 ? 'is-alt' : undefined,
                  item.severity ? `is-${item.severity}` : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-tone={tone}
              >
                {swatches.length > 0 ? (
                  <div
                    className="plexon-ui-finding-list__swatch-card"
                    aria-label={`Farben ${swatches.join(', ')}`}
                  >
                    <span
                      className="plexon-ui-finding-list__swatch-hero"
                      style={{ background: swatches[0] }}
                      title={swatches[0]}
                      aria-hidden
                    />
                    {swatches.length > 1 ? (
                      <SwatchStrip swatches={swatches.slice(1)} max={7} />
                    ) : (
                      <code className="plexon-ui-finding-list__hex">{swatches[0]}</code>
                    )}
                  </div>
                ) : null}
                <div className="plexon-ui-finding-list__body">
                  <div className="plexon-ui-finding-list__head">
                    <Text role="title" size="lg" as="h4" className="plexon-ui-finding-list__title">
                      {item.title}
                    </Text>
                    {badge ? (
                      <Chip static size="sm">
                        {badge}
                      </Chip>
                    ) : null}
                  </div>
                  {item.description?.trim() ? (
                    <Text role="meta" as="p" className="plexon-ui-finding-list__desc">
                      {item.description.trim()}
                    </Text>
                  ) : null}
                  {swatches.length > 1 ? (
                    <code className="plexon-ui-finding-list__hex-row">
                      {swatches.join(' · ')}
                    </code>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </ChatBlockPanel>
    </div>
  )
}
