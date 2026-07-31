/**
 * Minimal layout helpers replacing MUI Box/Stack during @msqdx/ui cutover.
 * Prefer semantic HTML + CSS classes for new code.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type BoxProps = HTMLAttributes<HTMLDivElement> & {
  component?: keyof JSX.IntrinsicElements
  sx?: Record<string, unknown>
  children?: ReactNode
}

function flattenSx(sx?: BoxProps['sx']): CSSProperties {
  if (!sx) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(sx)) {
    if (value == null) continue
    if (key.startsWith('&') || key.startsWith('@')) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      const responsive = value as Record<string, unknown>
      out[key] = responsive.sm ?? responsive.md ?? responsive.xs ?? responsive.lg ?? value
      continue
    }
    out[key] = value
  }
  return out as CSSProperties
}

export function Box({ component = 'div', sx, style, children, ...rest }: BoxProps) {
  const Comp = component as 'div'
  return (
    <Comp style={{ ...flattenSx(sx), ...style }} {...rest}>
      {children}
    </Comp>
  )
}

type StackProps = BoxProps & {
  direction?: 'row' | 'column' | { xs?: 'row' | 'column'; sm?: 'row' | 'column'; md?: 'row' | 'column' }
  spacing?: number | string
  gap?: number | string
  alignItems?: CSSProperties['alignItems'] | { xs?: CSSProperties['alignItems']; sm?: CSSProperties['alignItems'] }
  justifyContent?: CSSProperties['justifyContent']
  flexWrap?: CSSProperties['flexWrap']
}

function resolveResponsiveDirection(
  direction?: StackProps['direction'],
): CSSProperties['flexDirection'] {
  if (!direction || typeof direction === 'string') return direction ?? 'column'
  return direction.sm ?? direction.md ?? direction.xs ?? 'column'
}

function resolveResponsiveAlign(
  align?: StackProps['alignItems'],
): CSSProperties['alignItems'] | undefined {
  if (!align || typeof align === 'string') return align
  return align.sm ?? align.xs
}

export function Stack({
  direction = 'column',
  spacing,
  gap,
  alignItems,
  justifyContent,
  flexWrap,
  sx,
  style,
  ...rest
}: StackProps) {
  const resolvedGap =
    gap ?? (typeof spacing === 'number' ? `${spacing * 0.5}rem` : spacing)
  return (
    <Box
      {...rest}
      style={{
        display: 'flex',
        flexDirection: resolveResponsiveDirection(direction),
        alignItems: resolveResponsiveAlign(alignItems),
        justifyContent,
        flexWrap,
        gap: resolvedGap,
        ...flattenSx(sx),
        ...style,
      }}
    />
  )
}
