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

type LegacySx = CSSProperties & Record<string, unknown>

function sxStyle(sx?: LegacySx, style?: CSSProperties): CSSProperties | undefined {
  if (!sx && !style) return undefined
  const out: Record<string, unknown> = { ...style }
  if (sx) {
    for (const [k, v] of Object.entries(sx)) {
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
  sx,
  style,
  children,
  ...rest
}: {
  variant?: 'contained' | 'outlined' | 'text' | string
  fullWidth?: boolean
  size?: 'small' | 'medium' | 'large' | string
  sx?: LegacySx
  style?: CSSProperties
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
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

export function MsqdxIconButton({
  sx,
  style,
  children,
  ...rest
}: { sx?: LegacySx; style?: CSSProperties; children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" style={sxStyle(sx, style)} {...rest}>
      {children}
    </button>
  )
}

export function MsqdxFormField({
  label,
  value,
  onChange,
  type = 'text',
  fullWidth,
  required,
  sx,
  ...rest
}: {
  label?: string
  value?: string
  onChange?: (e: { target: HTMLInputElement }) => void
  type?: string
  fullWidth?: boolean
  required?: boolean
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
  ...rest
}: { sx?: LegacySx; style?: CSSProperties; children?: ReactNode } & Record<string, unknown>) {
  return (
    <Panel className="plexon-legacy-card" style={sxStyle(sx, style)} {...rest}>
      {children}
    </Panel>
  )
}

export function MsqdxMoleculeCard(props: Parameters<typeof MsqdxCard>[0] & { variant?: string; borderRadius?: string }) {
  return <MsqdxCard {...props} />
}

export function MsqdxDivider() {
  return <hr className="plexon-divider" />
}

export function MsqdxAvatar({ name, sx, style }: { name?: string; sx?: LegacySx; style?: CSSProperties }) {
  return <Avatar name={name ?? '?'} size="md" style={sxStyle(sx, style)} />
}

export function MsqdxChip({ label, children, sx, style }: { label?: string; children?: ReactNode; sx?: LegacySx; style?: CSSProperties }) {
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
}: {
  label?: string
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  options?: Array<{ value: string; label: string }>
  fullWidth?: boolean
}) {
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

export function MsqdxIcon({ name, sx, style }: { name?: string; sx?: LegacySx; style?: CSSProperties }) {
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

export function MsqdxStepper({ steps, activeStep }: { steps?: string[]; activeStep?: number }) {
  return (
    <ol className="plexon-stepper">
      {steps?.map((step, i) => (
        <li key={step} data-active={i === activeStep}>
          {step}
        </li>
      ))}
    </ol>
  )
}

export type AdminNavItem = { label: string; path: string; icon?: string }
