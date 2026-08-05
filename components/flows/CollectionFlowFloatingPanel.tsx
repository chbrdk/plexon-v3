'use client'

import type { ReactNode } from 'react'
import { FloatingPanel, type FloatingPanelVariant } from '@msqdx/ui'
import type { RailDockEdge } from '@/lib/msqdx-ui-shell'

/**
 * Thin Collection Flow wrapper — dock keys + board classNames on DS FloatingPanel.
 * Mirrors Audion `UxFlowFloatingPanel` for board parity (Wave 5).
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
 */
export function CollectionFlowFloatingPanel({
  children,
  className,
  storageKey,
  defaultEdge = 'top',
  defaultOffset = 0.5,
  title,
  ariaLabel,
  variant = 'panel',
}: {
  children: ReactNode
  className?: string
  storageKey: string
  defaultEdge?: RailDockEdge
  defaultOffset?: number
  title?: string
  ariaLabel?: string
  variant?: FloatingPanelVariant
}) {
  return (
    <FloatingPanel
      storageKey={storageKey}
      defaultEdge={defaultEdge}
      defaultOffset={defaultOffset}
      title={title}
      ariaLabel={ariaLabel}
      variant={variant}
      surface="solid"
      className={['msqdx-flow-float-panel', className].filter(Boolean).join(' ')}
    >
      {children}
    </FloatingPanel>
  )
}
