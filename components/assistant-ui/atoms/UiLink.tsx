'use client'

import { Text } from '@msqdx/ui'

type UiLinkProps = {
  href: string
  label: string
  external?: boolean
}

export function UiLink({ href, label, external }: UiLinkProps) {
  return (
    <a
      className="plexon-assistant-link"
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      <Text role="body" as="span" className="plexon-assistant-link-label">
        {label}
      </Text>
    </a>
  )
}
