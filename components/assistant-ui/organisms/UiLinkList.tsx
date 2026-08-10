'use client'

import type { linkListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiLink } from '@/components/assistant-ui/atoms/UiLink'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof linkListPropsSchema>

export function UiLinkList({ title, links }: Props) {
  return (
    <UiBlockSurface title={title} eyebrow="links" className="plexon-assistant-link-list">
      <ul className="plexon-assistant-links">
        {links.map((link) => (
          <li key={link.href + link.label} className="plexon-assistant-links-item">
            <span className="plexon-assistant-links-marker" aria-hidden>
              {link.external ? '↗' : '→'}
            </span>
            <UiLink href={link.href} label={link.label} external={link.external} />
          </li>
        ))}
      </ul>
    </UiBlockSurface>
  )
}
