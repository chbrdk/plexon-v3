/**
 * MUI compatibility layer — maps legacy @mui/material imports to plain React + CSS vars.
 * Used during plexon-v3 cutover to @msqdx/ui. Prefer direct @msqdx/ui in new/migrated code.
 */
'use client'

import {
  Children,
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  useContext,
} from 'react'
import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import type React from 'react'
import { Alert as DsAlert } from '@msqdx/ui'
import { Box, Stack } from '@/components/ui/layout'

export { Box, Stack }

export type SxProps = Record<string, unknown>
export type BoxProps = HTMLAttributes<HTMLDivElement> & {
  component?: keyof JSX.IntrinsicElements
  sx?: SxProps
}
export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; fullWidth?: boolean; sx?: SxProps }
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { sx?: SxProps; fullWidth?: boolean }
export type RadioGroupProps = HTMLAttributes<HTMLDivElement> & { value?: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }
export type FormGroupProps = HTMLAttributes<HTMLDivElement>
export type InputBaseProps = InputHTMLAttributes<HTMLInputElement>
export type SwitchProps = { checked?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; sx?: SxProps }
export type StepperProps = HTMLAttributes<HTMLDivElement> & { activeStep?: number; orientation?: 'horizontal' | 'vertical' }

export type SelectChangeEvent<T = string> = {
  target: { value: T; name?: string }
}

function mergeSx(sx?: SxProps, style?: CSSProperties): CSSProperties {
  if (!sx) return style ?? {}
  const out: Record<string, unknown> = { ...style }
  for (const [k, v] of Object.entries(sx)) {
    if (v == null || k.startsWith('&') || k.startsWith('@')) continue
    if (typeof v === 'object' && !Array.isArray(v)) {
      const responsive = v as Record<string, unknown>
      out[k] = responsive.sm ?? responsive.md ?? responsive.xs ?? responsive.lg ?? v
      continue
    }
    out[k] = v
  }
  return out as CSSProperties
}

type DivProps = HTMLAttributes<HTMLDivElement> & { sx?: SxProps; component?: keyof JSX.IntrinsicElements }

function DivLike({ sx, style, component, children, ...rest }: DivProps) {
  const Tag = (component ?? 'div') as keyof JSX.IntrinsicElements
  return (
    <Tag style={mergeSx(sx, style)} {...rest}>
      {children}
    </Tag>
  )
}

type StyledOptions = {
  shouldForwardProp?: (prop: string) => boolean
}

type StyleInput =
  | Record<string, unknown>
  | ((props: Record<string, unknown> & { theme: ReturnType<typeof useTheme> }) => Record<string, unknown>)

function resolveStyledStyles(styles: StyleInput, props: Record<string, unknown>): Record<string, unknown> {
  const theme = useTheme()
  return typeof styles === 'function' ? styles({ theme, ...props }) : styles
}

function inlineFromStyledRules(rules: Record<string, unknown>, className?: string, props?: Record<string, unknown>): CSSProperties {
  const style: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rules)) {
    if (key.startsWith('&.')) {
      const cls = key.slice(2)
      const hasClass = className?.split(/\s+/).includes(cls)
      if (hasClass || props?.selected) {
        Object.assign(style, value as Record<string, unknown>)
      }
      continue
    }
    if (key.startsWith('&') || key.startsWith('@')) continue
    style[key] = value
  }
  return style as CSSProperties
}

export function styled(component: string | React.ComponentType<Record<string, unknown>>, options?: StyledOptions) {
  const shouldForward = options?.shouldForwardProp ?? (() => true)

  return (styles: StyleInput) => {
    const StyledComponent = forwardRef<HTMLElement, Record<string, unknown>>(function StyledInner(props, ref) {
      const { style, sx, className, children, ...rest } = props
      const mergedClass = typeof className === 'string' ? className : undefined
      const rules = resolveStyledStyles(styles, props)
      const computed = inlineFromStyledRules(rules, mergedClass, props)
      const forwarded: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(rest)) {
        if (shouldForward(k)) forwarded[k] = v
      }

      if (typeof component === 'string') {
        return createElement(component, {
          ref,
          className: mergedClass,
          style: { ...computed, ...(style as CSSProperties) },
          ...forwarded,
          children,
        })
      }

      return createElement(component, {
        ref,
        className: mergedClass,
        sx: { ...computed, ...(sx as object) },
        style,
        ...forwarded,
        children,
      })
    })
    return StyledComponent as React.ComponentType<Record<string, unknown>>
  }
}

const TabsContext = createContext<{ value?: string | number; onChange?: (e: unknown, v: string | number) => void }>({})

export function Tabs({
  value,
  onChange,
  children,
  className,
  style,
  ...rest
}: DivProps & { value?: string | number; onChange?: (e: unknown, v: string | number) => void }) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`MuiTabs-root ${className ?? ''}`.trim()} style={style} role="tablist" {...rest}>
        {children}
        <span className="MuiTabs-indicator" aria-hidden />
      </div>
    </TabsContext.Provider>
  )
}

export function Tab({
  value,
  label,
  className,
  icon,
  selected: selectedProp,
  onClick,
  ...rest
}: {
  value?: string | number
  label?: ReactNode
  className?: string
  icon?: ReactNode
  iconPosition?: string
  compact?: boolean
  selected?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}) {
  const ctx = useContext(TabsContext)
  const selected = selectedProp ?? ctx.value === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={`MuiTab-root ${selected ? 'Mui-selected' : ''} ${className ?? ''}`.trim()}
      onClick={(e) => {
        onClick?.(e)
        if (value != null) ctx.onChange?.(e, value)
      }}
      {...rest}
    >
      {icon}
      {label}
    </button>
  )
}

export function Typography({
  variant,
  sx,
  style,
  children,
  ...rest
}: DivProps & { variant?: string }) {
  const role =
    variant === 'h4' || variant === 'h5' || variant === 'h6'
      ? 'title'
      : variant === 'body2' || variant === 'caption'
        ? 'meta'
        : 'body'
  return (
    <p className={`ds-text-${role}`} style={mergeSx(sx, style)} {...rest}>
      {children}
    </p>
  )
}

export function TextField({
  label,
  value,
  onChange,
  fullWidth,
  sx,
  style,
  ...rest
}: TextFieldProps) {
  return (
    <label style={{ display: 'grid', gap: '0.35rem', width: fullWidth ? '100%' : undefined, ...mergeSx(sx, style) }}>
      {label ? <span className="ds-field-label">{label}</span> : null}
      <input className="ds-input" value={value} onChange={onChange} {...rest} />
    </label>
  )
}

export function Alert({
  severity,
  sx,
  style,
  children,
  ...rest
}: DivProps & { severity?: 'error' | 'warning' | 'info' | 'success' }) {
  const tone = severity === 'error' ? 'danger' : severity === 'warning' ? 'warning' : 'info'
  return (
    <DsAlert tone={tone} style={mergeSx(sx, style)} {...rest}>
      {children}
    </DsAlert>
  )
}

export function Chip({ label, sx, style, children, ...rest }: DivProps & { label?: string }) {
  return (
    <span className="ds-chip" style={mergeSx(sx, style)} {...rest}>
      {label ?? children}
    </span>
  )
}

export function IconButton({
  sx,
  style,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { sx?: SxProps }) {
  return (
    <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" style={mergeSx(sx, style)} {...rest}>
      {children}
    </button>
  )
}

export function Popover({
  open,
  children,
  anchorEl,
  onClose,
  ...rest
}: {
  open?: boolean
  children?: ReactNode
  anchorEl?: unknown
  onClose?: () => void
}) {
  if (!open) return null
  return (
    <div className="plexon-popover" data-anchor={anchorEl ? 'true' : undefined} {...rest}>
      {children}
    </div>
  )
}

export function Collapse({ in: show, children }: { in?: boolean; children?: ReactNode }) {
  if (!show) return null
  return <>{children}</>
}

export function LinearProgress({ sx, style }: { sx?: SxProps; style?: CSSProperties }) {
  return <div className="plexon-linear-progress" style={mergeSx(sx, style)} role="progressbar" />
}

export function CircularProgress({ sx, style, size }: { sx?: SxProps; style?: CSSProperties; size?: number }) {
  const px = size ?? 20
  return (
    <div
      className="plexon-spinner"
      style={{ width: px, height: px, ...mergeSx(sx, style) }}
      role="status"
      aria-label="Loading"
    />
  )
}

export function Dialog({ open, onClose, children }: { open?: boolean; onClose?: () => void; children?: ReactNode }) {
  if (!open) return null
  return (
    <div className="plexon-dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="plexon-dialog" role="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function DialogTitle({ children, sx, style }: DivProps) {
  return (
    <DivLike component="h2" sx={sx} style={style} className="plexon-dialog-title">
      {children}
    </DivLike>
  )
}

export function DialogContent({ children, sx, style }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-dialog-content">
      {children}
    </DivLike>
  )
}

export function DialogActions({ children, sx, style }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-dialog-actions">
      {children}
    </DivLike>
  )
}

export function List({ children, sx, style }: DivProps) {
  return (
    <ul className="plexon-list" style={mergeSx(sx, style)}>
      {children}
    </ul>
  )
}

export function ListItemButton({
  children,
  sx,
  style,
  onClick,
  selected,
}: DivProps & { onClick?: () => void; selected?: boolean }) {
  return (
    <li>
      <button
        type="button"
        className="plexon-list-item-button"
        data-selected={selected ? 'true' : undefined}
        style={mergeSx(sx, style)}
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  )
}

export function Tooltip({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <span className="plexon-tooltip" title={typeof title === 'string' ? title : undefined}>
      {children}
    </span>
  )
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; sx?: SxProps }) {
  const { sx, style, children, ...rest } = props
  return (
    <button type="button" className="ds-btn ds-btn--primary ds-btn--sm" style={mergeSx(sx, style)} {...rest}>
      {children}
    </button>
  )
}

export function Checkbox({
  checked,
  onChange,
  sx,
  style,
}: {
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  sx?: SxProps
  style?: CSSProperties
}) {
  return <input type="checkbox" checked={checked} onChange={onChange} style={mergeSx(sx, style)} />
}

export function Radio({
  checked,
  onChange,
  value,
  sx,
  style,
}: {
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  value?: string | number
  sx?: SxProps
  style?: CSSProperties
}) {
  return <input type="radio" checked={checked} onChange={onChange} value={value} style={mergeSx(sx, style)} />
}

export function RadioGroup({
  value,
  onChange,
  children,
  sx,
  style,
  ...rest
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      style={mergeSx(sx, style)}
      {...rest}
      onChange={onChange}
      data-value={value}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        return cloneElement(child as React.ReactElement<{ checked?: boolean }>, {
          checked: child.props.value === value,
        })
      })}
    </div>
  )
}

export function FormControlLabel({ control, label }: { control: ReactNode; label?: ReactNode }) {
  return (
    <label className="plexon-form-control-label">
      {control}
      <span>{label}</span>
    </label>
  )
}

export function FormControl({ children, sx, style }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-form-control">
      {children}
    </DivLike>
  )
}

export function FormGroup({ children, sx, style, ...rest }: FormGroupProps & { sx?: SxProps }) {
  return (
    <DivLike sx={sx} style={style} className="plexon-form-group" {...rest}>
      {children}
    </DivLike>
  )
}

export function FormHelperText({ children, sx, style }: DivProps) {
  return (
    <p className="plexon-form-helper-text" style={mergeSx(sx, style)}>
      {children}
    </p>
  )
}

export function InputLabel({ children, sx, style }: DivProps) {
  return (
    <span className="ds-field-label" style={mergeSx(sx, style)}>
      {children}
    </span>
  )
}

export function Drawer({ open, children, onClose }: { open?: boolean; children?: ReactNode; onClose?: () => void }) {
  if (!open) return null
  return (
    <div className="plexon-drawer-backdrop" onClick={onClose}>
      <aside className="plexon-drawer" onClick={(e) => e.stopPropagation()}>
        {children}
      </aside>
    </div>
  )
}

export function MenuItem({ children, onClick, sx, style, value }: DivProps & { onClick?: () => void; value?: string | number }) {
  return (
    <button type="button" className="plexon-menu-item" style={mergeSx(sx, style)} onClick={onClick} data-value={value}>
      {children}
    </button>
  )
}

export function Select(props: SelectProps) {
  const { sx, style, fullWidth, children, ...rest } = props
  return (
    <select className="ds-select-native-bridge" style={{ width: fullWidth ? '100%' : undefined, ...mergeSx(sx, style) }} {...rest}>
      {children}
    </select>
  )
}

export function MuiLink({ href, children, sx, style, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { sx?: SxProps }) {
  return (
    <a href={href} style={mergeSx(sx, style)} {...rest}>
      {children}
    </a>
  )
}

export { MuiLink as Link }

export function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className="plexon-table" {...props} />
}

export function TableHead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />
}

export function TableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} />
}

export function Paper({ children, sx, style, ...rest }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-paper" {...rest}>
      {children}
    </DivLike>
  )
}

export function Divider({ sx, style }: DivProps) {
  return <hr className="plexon-divider" style={mergeSx(sx, style)} />
}

export function Portal({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

export function Avatar({ children, sx, style, ...rest }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-avatar" {...rest}>
      {children}
    </DivLike>
  )
}

export function Switch({
  checked,
  onChange,
  sx,
  style,
}: SwitchProps & { style?: CSSProperties }) {
  return <input type="checkbox" role="switch" checked={checked} onChange={onChange} style={mergeSx(sx, style)} />
}

export function Snackbar({ open, children, onClose }: { open?: boolean; children?: ReactNode; onClose?: () => void }) {
  if (!open) return null
  return (
    <div className="plexon-snackbar" role="status" onClick={onClose}>
      {children}
    </div>
  )
}

export function Slider({
  value,
  min,
  max,
  onChange,
  sx,
  style,
}: {
  value?: number | number[]
  min?: number
  max?: number
  onChange?: (event: unknown, value: number | number[]) => void
  sx?: SxProps
  style?: CSSProperties
}) {
  const num = Array.isArray(value) ? value[0] : value
  return (
    <input
      type="range"
      className="plexon-slider"
      value={num ?? min ?? 0}
      min={min}
      max={max}
      style={mergeSx(sx, style)}
      onChange={(e) => onChange?.(e, Number(e.target.value))}
    />
  )
}

export function Stepper({ children, activeStep, sx, style, ...rest }: StepperProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-stepper" data-active-step={activeStep} {...rest}>
      {children}
    </DivLike>
  )
}

export function Step({ children, sx, style }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-step">
      {children}
    </DivLike>
  )
}

export function StepLabel({ children, sx, style }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-step-label">
      {children}
    </DivLike>
  )
}

export function StepContent({ children, sx, style }: DivProps) {
  return (
    <DivLike sx={sx} style={style} className="plexon-step-content">
      {children}
    </DivLike>
  )
}

export function Toolbar({ children, sx, style, ...rest }: DivProps) {
  return (
    <DivLike component="header" sx={sx} style={style} className="plexon-toolbar" {...rest}>
      {children}
    </DivLike>
  )
}

export type Theme = ReturnType<typeof createTheme>

export function CssBaseline() {
  return null
}

export function createTheme() {
  return {
    palette: {
      mode: 'dark' as const,
      text: { primary: '#ffffff' },
    },
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useTheme() {
  return {
    breakpoints: {
      down: () => false,
      up: () => true,
    },
    palette: {
      mode: 'dark' as const,
      text: { primary: '#ffffff' },
    },
  }
}

export function useMediaQuery() {
  return false
}

export function alpha(color: string, opacity: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, opacity)) * 100)
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

export default {
  Box,
  Stack,
  Typography,
  TextField,
  Alert,
  Chip,
  IconButton,
  Popover,
  Collapse,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  Tooltip,
  Tabs,
  Tab,
  styled,
  Paper,
  Divider,
  Portal,
  Avatar,
  Switch,
  Snackbar,
  Slider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Toolbar,
  FormControl,
  FormGroup,
  FormHelperText,
  InputLabel,
  Radio,
  RadioGroup,
}
