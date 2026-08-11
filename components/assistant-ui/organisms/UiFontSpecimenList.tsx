'use client'

import { ChatBlockPanel } from '@msqdx/ui'
import type { fontSpecimenListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof fontSpecimenListPropsSchema>

/** Generative `font_specimen_list` — Brandion typography tokens (no webfont load). */
export function UiFontSpecimenList({ title, items }: Props) {
  return (
    <div data-plexon-assistant-ui data-testid="ui-font-specimen-list">
      <ChatBlockPanel title={title} eyebrow="brandion · type">
        <ul className="plexon-ui-font-specimen-list">
          {items.map((item) => (
            <li key={`${item.path ?? item.label}-${item.family}`} className="plexon-ui-font-specimen-list__row">
              <div className="plexon-ui-font-specimen-list__meta">
                <span className="plexon-ui-font-specimen-list__label">{item.label}</span>
                <span className="plexon-ui-font-specimen-list__family">
                  {item.family}
                  {item.weight ? ` · ${item.weight}` : ''}
                </span>
                {item.path ? (
                  <span className="plexon-ui-font-specimen-list__path">{item.path}</span>
                ) : null}
              </div>
              <p
                className="plexon-ui-font-specimen-list__sample"
                style={{
                  fontFamily: `"${item.family}", system-ui, sans-serif`,
                  fontWeight: item.weight ?? undefined,
                }}
              >
                {item.sample?.trim() || 'Ag The quick brown fox'}
              </p>
            </li>
          ))}
        </ul>
      </ChatBlockPanel>
    </div>
  )
}
