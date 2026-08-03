'use client'

import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import {
  Avatar,
  Button,
  Chip,
  Field,
  Input,
  Panel,
  Text,
} from '@msqdx/ui'

type LegacySx = CSSProperties | Record<string, unknown> | Array<CSSProperties | Record<string, unknown> | boolean | null | undefined>

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

const VARIANT_ROLE: Record<string, 'headline' | 'title' | 'body' | 'meta'> = {
  h1: 'headline',
  h2: 'headline',
  h3: 'title',
  h4: 'title',
  h5: 'title',
  h6: 'title',
  body1: 'body',
  body2: 'meta',
  caption: 'meta',
  overline: 'meta',
}

export function MsqdxTypography({
  variant = 'body1',
  weight,
  sx,
  style,
  children,
  ...rest
}: {
  variant?: string
  weight?: string
  sx?: LegacySx
  style?: CSSProperties
  children?: ReactNode
} & Record<string, unknown>) {
  const role = VARIANT_ROLE[variant] ?? 'body'
  const className = weight === 'light' ? 'plexon-text-light' : weight === 'bold' ? 'plexon-text-bold' : undefined
  return (
    <Text role={role} className={className} style={sxStyle(sx, style)} {...rest}>
      {children}
    </Text>
  )
}

export function MsqdxButton({
  variant = 'contained',
  fullWidth,
  size,
  brandColor: _brandColor,
  component: _component,
  sx,
  style,
  children,
  ...rest
}: {
  variant?: 'contained' | 'outlined' | 'text' | string
  fullWidth?: boolean
  size?: 'small' | 'medium' | 'large' | string
  brandColor?: string
  component?: string
  sx?: LegacySx
  style?: CSSProperties
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) {
  const mapped =
    variant === 'outlined' ? 'ghost' : variant === 'text' ? 'link' : variant === 'contained' ? 'primary' : 'primary'
  const sizeClass = size === 'small' ? 'ds-btn--sm' : size === 'large' ? 'ds-btn--lg' : undefined
  return (
    <Button
      variant={mapped as 'primary' | 'ghost' | 'link'}
      block={fullWidth}
      className={['plexon-legacy-btn', sizeClass].filter(Boolean).join(' ')}
      style={sxStyle(sx, style)}
      {...rest}
    >
      {children}
    </Button>
  )
}

export type MsqdxIconButtonProps = {
  sx?: LegacySx
  style?: CSSProperties
  children?: ReactNode
  size?: string
  title?: string
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function MsqdxIconButton({ sx, style, children, size: _size, ...rest }: MsqdxIconButtonProps) {
  return (
    <Button variant="ghost" size="sm" style={sxStyle(sx, style)} {...rest}>
      {children}
    </Button>
  )
}

export function MsqdxTooltip({
  title,
  children,
}: {
  title?: ReactNode
  children?: ReactNode
  placement?: string
}) {
  return (
    <span className="plexon-tooltip" title={typeof title === 'string' ? title : undefined}>
      {children}
    </span>
  )
}

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className} style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>
      {content}
    </div>
  )
}

export function MsqdxPrismionToolbar({
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

export function MsqdxCornerTabSection({
  children,
  tab,
  placement,
  ..._rest
}: {
  children?: ReactNode
  tab?: ReactNode
  placement?: string
} & Record<string, unknown>) {
  return (
    <div className="plexon-corner-tab-section" data-placement={placement}>
      {tab}
      <div className="plexon-corner-tab-section__body">{children}</div>
    </div>
  )
}

export function MsqdxCornerTabSectionTab({
  heading,
  children,
  ..._rest
}: {
  heading?: ReactNode
  children?: ReactNode
} & Record<string, unknown>) {
  return (
    <div className="plexon-corner-tab-section__tab">
      {heading}
      {children}
    </div>
  )
}

export function MsqdxFormField({
  label,
  value,
  onChange,
  type = 'text',
  fullWidth,
  required,
  size: _size,
  sx,
  ...rest
}: {
  label?: string
  value?: string
  onChange?: (e: { target: HTMLInputElement }) => void
  type?: string
  fullWidth?: boolean
  required?: boolean
  size?: string
  sx?: LegacySx
} & Record<string, unknown>) {
  return (
    <Field label={label} size="md" style={sxStyle(sx)}>
      <Input
        type={type}
        value={value}
        onChange={onChange as InputHTMLAttributes<HTMLInputElement>['onChange']}
        required={required}
        block={fullWidth}
        {...rest}
      />
    </Field>
  )
}

export function MsqdxInput(props: InputHTMLAttributes<HTMLInputElement> & { fullWidth?: boolean }) {
  const { fullWidth, ...rest } = props
  return <Input block={fullWidth} {...rest} />
}

export function MsqdxCard({
  sx,
  style,
  children,
  variant: _variant,
  borderRadius: _borderRadius,
  brandColor: _brandColor,
  hoverable: _hoverable,
  ...rest
}: {
  sx?: LegacySx
  style?: CSSProperties
  children?: ReactNode
  variant?: string
  borderRadius?: string
  brandColor?: string
  hoverable?: boolean
} & React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) {
  return (
    <Panel className="plexon-legacy-card" style={sxStyle(sx, style)} {...rest}>
      {children}
    </Panel>
  )
}

export function MsqdxMoleculeCard(props: Parameters<typeof MsqdxCard>[0] & { variant?: string; borderRadius?: string }) {
  return <MsqdxCard {...props} />
}

export function MsqdxDivider({ spacing: _spacing }: { spacing?: string } = {}) {
  return <hr className="plexon-divider" />
}

export function MsqdxAvatar({
  name,
  children,
  src: _src,
  size: _size,
  sx,
  style,
}: {
  name?: string
  children?: ReactNode
  src?: string
  size?: string
  sx?: LegacySx
  style?: CSSProperties
}) {
  const label = name ?? (typeof children === 'string' ? children : '?')
  return <Avatar name={label} size="md" style={sxStyle(sx, style)} />
}

export function MsqdxChip({
  label,
  children,
  sx,
  style,
  size: _size,
  brandColor: _brandColor,
  ..._rest
}: {
  label?: string
  children?: ReactNode
  sx?: LegacySx
  style?: CSSProperties
  size?: string
  brandColor?: string
} & Record<string, unknown>) {
  return (
    <Chip style={sxStyle(sx, style)}>
      {label ?? children}
    </Chip>
  )
}

export function MsqdxSelect({
  label,
  value,
  onChange,
  options,
  fullWidth,
  size: _size,
  sx: _sx,
  ..._rest
}: {
  label?: string
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  options?: Array<{ value: string; label: string }>
  fullWidth?: boolean
  size?: string
  sx?: LegacySx
} & Record<string, unknown>) {
  return (
    <Field label={label} size="md">
      <select
        className="ds-select-native-bridge"
        value={value}
        onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        style={{ width: fullWidth ? '100%' : undefined }}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function MsqdxLogo({ width, height }: { width?: number; height?: number; color?: string }) {
  return (
    <svg width={width ?? 120} height={height ?? 28} viewBox="0 0 120 28" aria-label="MSQ DX">
      <text x="0" y="20" fill="currentColor" fontSize="18" fontWeight="600">
        MSQ DX
      </text>
    </svg>
  )
}

export function MsqdxIcon({
  name,
  sx,
  style,
  size: _size,
  customSize: _customSize,
}: {
  name?: string
  sx?: LegacySx
  style?: CSSProperties
  size?: string
  customSize?: number
}) {
  return (
    <span className="material-symbols-outlined" style={sxStyle(sx, style)} aria-hidden>
      {name}
    </span>
  )
}

export function MsqdxAppLayout({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

export function MsqdxAdminNav() {
  return null
}

export function MsqdxGlassChatPanel({ children, sx, style }: { children?: ReactNode; sx?: LegacySx; style?: CSSProperties }) {
  return (
    <div className="plexon-chat-panel" style={sxStyle(sx, style)}>
      {children}
    </div>
  )
}

export function MsqdxStepper({
  steps,
  activeStep,
  ..._rest
}: {
  steps?: Array<string | { label?: string; description?: string; [key: string]: unknown }>
  activeStep?: number
} & Record<string, unknown>) {
  return (
    <ol className="plexon-stepper">
      {steps?.map((step, i) => {
        const label = typeof step === 'string' ? step : step.label ?? `Step ${i + 1}`
        return (
          <li key={`${label}-${i}`} data-active={i === activeStep}>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

export type AdminNavItem = { label: string; path: string; icon?: string }
