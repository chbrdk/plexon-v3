/** Type-only shims for @mui/material/* subpath imports used by msqdx-design-system. */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

export type PopperPlacementType =
  | 'auto'
  | 'auto-start'
  | 'auto-end'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & { sx?: Record<string, unknown> }

export type SnackbarOrigin = { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' }

export type SliderProps = {
  value?: number | number[]
  min?: number
  max?: number
  onChange?: (event: unknown, value: number | number[]) => void
  sx?: Record<string, unknown>
}
