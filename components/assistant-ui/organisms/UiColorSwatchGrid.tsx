'use client'

import { ChatBlockPanel, SwatchStrip } from '@msqdx/ui'
import type { colorSwatchGridPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof colorSwatchGridPropsSchema>

/** Generative `color_swatch_grid` — Brandion color tokens with live swatches. */
export function UiColorSwatchGrid({ title, guidelineName, items }: Props) {
  const swatches = items.map((item) => item.hex)
  return (
    <div data-plexon-assistant-ui data-testid="ui-color-swatch-grid">
      <ChatBlockPanel title={title} eyebrow={guidelineName ? 'brandion · color' : 'color'}>
        <div className="plexon-ui-color-swatch-grid">
          <SwatchStrip swatches={swatches} label={`${items.length} Farben`} max={24} />
          <ul className="plexon-ui-color-swatch-grid__list">
            {items.map((item) => (
              <li key={`${item.path ?? item.label}-${item.hex}`} className="plexon-ui-color-swatch-grid__row">
                <span
                  className="plexon-ui-color-swatch-grid__swatch"
                  style={{ background: item.hex }}
                  title={item.hex}
                  aria-hidden
                />
                <span className="plexon-ui-color-swatch-grid__meta">
                  <span className="plexon-ui-color-swatch-grid__label">{item.label}</span>
                  {item.path ? (
                    <span className="plexon-ui-color-swatch-grid__path">{item.path}</span>
                  ) : null}
                </span>
                <code className="plexon-ui-color-swatch-grid__hex">{item.hex}</code>
              </li>
            ))}
          </ul>
        </div>
      </ChatBlockPanel>
    </div>
  )
}
