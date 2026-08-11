'use client'

import { Text } from '@msqdx/ui'

type UiBlockTitleProps = {
  children: string
  /** @deprecated Ignored — MUI sx dropped in Wave 7. Prefer className. */
  sx?: Record<string, unknown>
  className?: string
}

export function UiBlockTitle({ children, className }: UiBlockTitleProps) {
  return (
    <Text
      role="title"
      size="xl"
      as="h3"
      className={['plexon-assistant-block-title', className].filter(Boolean).join(' ')}
    >
      {children}
    </Text>
  )
}
