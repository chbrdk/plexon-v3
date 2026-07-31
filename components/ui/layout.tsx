/**
 * Minimal layout helpers replacing MUI Box/Stack during @msqdx/ui cutover.
 * Prefer semantic HTML + CSS classes for new code.
 */
import { forwardRef } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type BoxProps = HTMLAttributes<HTMLDivElement> & {
  component?: keyof JSX.IntrinsicElements
  sx?: Record<string, unknown>
  children?: ReactNode
  href?: string
  target?: string
  rel?: string
  type?: string
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

export const Box = forwardRef<HTMLDivElement, BoxProps>(function Box(
  { component = 'div', sx, style, children, ...rest },
  ref,
) {
  const Comp = component as 'div'
  return (
    <Comp ref={ref} style={{ ...flattenSx(sx), ...style }} {...rest}>
      {children}
    </Comp>
  )
})

type StackProps = BoxProps & {
  direction?: 'row' | 'column' | { xs?: 'row' | 'column'; sm?: 'row' | 'column'; md?: 'row' | 'column' }
  spacing?: number | string
  gap?: number | string
  alignItems?: CSSProperties['alignItems'] | { xs?: CSSProperties['alignItems']; sm?: CSSProperties['alignItems'] }
  justifyContent?: CSSProperties['justifyContent']
  flexWrap?: CSSProperties['flexWrap']
  useFlexGap?: boolean
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

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    direction = 'column',
    spacing,
    gap,
    alignItems,
    justifyContent,
    flexWrap,
    useFlexGap: _useFlexGap,
    sx,
    style,
    ...rest
  },
  ref,
) {
  const resolvedGap =
    gap ?? (typeof spacing === 'number' ? `${spacing * 0.5}rem` : spacing)
  return (
    <Box
      ref={ref}
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
})
