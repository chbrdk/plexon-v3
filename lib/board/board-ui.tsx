'use client'

/**
 * Board chrome — formerly imported via `@msqdx/react` bridge.
 * Uses `@msqdx/ui` only.
 */
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { Button, Input } from '@msqdx/ui'

type LegacySx =
  | CSSProperties
  | Record<string, unknown>
  | Array<CSSProperties | Record<string, unknown> | boolean | null | undefined>

function sxStyle(sx?: LegacySx, style?: CSSProperties): CSSProperties | undefined {
  if (!sx && !style) return undefined
  const out: Record<string, unknown> = { ...style }
  const parts = Array.isArray(sx) ? sx : sx ? [sx] : []
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue
    for (const [k, v] of Object.entries(part)) {
      if (v == null || k.startsWith('&') || k.startsWith('@')) continue
      out[k] = v
    }
  }
  return out as CSSProperties
}

export type BoardIconButtonProps = {
  sx?: LegacySx
  style?: CSSProperties
  children?: ReactNode
  size?: string
  className?: string
  onClick?: () => void
  'aria-label'?: string
  title?: string
  type?: 'button' | 'submit' | 'reset'
} & Record<string, unknown>

export function BoardIconButton({ sx, style, children, size: _size, ...rest }: BoardIconButtonProps) {
  return (
    <Button variant="ghost" size="sm" style={sxStyle(sx, style)} {...rest}>
      {children}
    </Button>
  )
}

export function BoardInput(props: InputHTMLAttributes<HTMLInputElement> & { fullWidth?: boolean; sx?: LegacySx }) {
  const { fullWidth, sx, style, ...rest } = props
  return <Input block={fullWidth} style={sxStyle(sx, style)} {...rest} />
}

export function BoardMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
    >
      {content}
    </div>
  )
}

export function BoardPrismionToolbar({
  onDelete,
  onBranch,
  onMerge,
  onLockToggle,
  onColorClick,
  onArchive: _onArchive,
}: {
  onDelete?: () => void
  onBranch?: () => void
  onMerge?: () => void
  onLockToggle?: () => void
  onColorClick?: () => void
  onArchive?: () => void
}) {
  return (
    <div className="plexon-prismion-toolbar" role="toolbar">
      {onColorClick ? (
        <Button type="button" variant="ghost" size="sm" onClick={onColorClick} aria-label="Color">
          color
        </Button>
      ) : null}
      {onBranch ? (
        <Button type="button" variant="ghost" size="sm" onClick={onBranch} aria-label="Branch">
          branch
        </Button>
      ) : null}
      {onMerge ? (
        <Button type="button" variant="ghost" size="sm" onClick={onMerge} aria-label="Merge">
          merge
        </Button>
      ) : null}
      {onLockToggle ? (
        <Button type="button" variant="ghost" size="sm" onClick={onLockToggle} aria-label="Lock">
          lock
        </Button>
      ) : null}
      {onDelete ? (
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Delete">
          delete
        </Button>
      ) : null}
    </div>
  )
}

export function BoardIcon({
  name,
  sx,
  style,
  size: _size,
}: {
  name?: string
  sx?: LegacySx
  style?: CSSProperties
  size?: string
}) {
  return (
    <span className="material-symbols-outlined" style={sxStyle(sx, style)} aria-hidden>
      {name}
    </span>
  )
}

/** Lightweight popover (was MUI shim). */
export function BoardPopover({
  open,
  children,
  anchorEl,
  onClose: _onClose,
  ...rest
}: {
  open?: boolean
  children?: ReactNode
  anchorEl?: unknown
  onClose?: () => void
  anchorOrigin?: unknown
  transformOrigin?: unknown
  slotProps?: unknown
}) {
  if (!open) return null
  return (
    <div className="plexon-popover" data-anchor={anchorEl ? 'true' : undefined} {...rest}>
      {children}
    </div>
  )
}
