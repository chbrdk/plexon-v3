'use client'

import { Text } from '@msqdx/ui'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type UiTextRole = 'body' | 'label' | 'caption'

type UiTextProps = {
  children: string | number
  /** Legacy MUI-ish variants — mapped to DS Text roles (compact chat density). */
  variant?: 'body2' | 'subtitle2' | 'caption'
  tone?: UiTone
  /** body = body copy, label/caption = meta */
  role?: UiTextRole
  /** @deprecated Ignored — MUI sx dropped in Wave 7. Prefer className. */
  sx?: Record<string, unknown>
  className?: string
}

export type UiTextTypography = {
  role: 'title' | 'meta' | 'hint' | 'label'
  size?: 'lg'
  as: 'p' | 'span'
}

/**
 * Map legacy variants → DS Text roles sized for assistant / chat density.
 * - subtitle2 → title @ lg (item headline, not magazine section title)
 * - body2 → meta (secondary prose under a headline)
 * - caption → hint
 */
export function resolveUiTextTypography(
  variant: UiTextProps['variant'] = 'body2',
  role: UiTextRole = 'body',
): UiTextTypography {
  if (role === 'label') return { role: 'label', as: 'span' }
  if (role === 'caption' || variant === 'caption') return { role: 'hint', as: 'span' }
  if (variant === 'subtitle2') return { role: 'title', size: 'lg', as: 'p' }
  return { role: 'meta', as: 'p' }
}

export function UiText({
  children,
  variant = 'body2',
  tone = 'neutral',
  role = 'body',
  className,
}: UiTextProps) {
  const typography = resolveUiTextTypography(variant, role)
  return (
    <Text
      role={typography.role}
      size={typography.size}
      as={typography.as}
      className={['plexon-assistant-text', `is-${tone}`, className].filter(Boolean).join(' ')}
    >
      {children}
    </Text>
  )
}
