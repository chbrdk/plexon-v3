'use client'

import { Text } from '@msqdx/ui'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type UiTextRole = 'body' | 'label' | 'caption'

type UiTextProps = {
  children: string | number
  variant?: 'body2' | 'subtitle2' | 'caption'
  tone?: UiTone
  /** body = body copy, label/caption = meta */
  role?: UiTextRole
  /** @deprecated Ignored — MUI sx dropped in Wave 7. Prefer className. */
  sx?: Record<string, unknown>
  className?: string
}

function textRole(
  variant: UiTextProps['variant'],
  role: UiTextRole
): 'body' | 'title' | 'meta' | 'label' {
  if (role === 'label') return 'label'
  if (role === 'caption' || variant === 'caption') return 'meta'
  if (variant === 'subtitle2') return 'title'
  return 'body'
}

export function UiText({
  children,
  variant = 'body2',
  tone = 'neutral',
  role = 'body',
  className,
}: UiTextProps) {
  return (
    <Text
      role={textRole(variant, role)}
      as={role === 'label' || role === 'caption' ? 'span' : 'p'}
      className={['plexon-assistant-text', `is-${tone}`, className].filter(Boolean).join(' ')}
    >
      {children}
    </Text>
  )
}
