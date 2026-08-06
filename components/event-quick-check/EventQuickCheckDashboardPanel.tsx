'use client'

import type { ReactNode } from 'react'
import { SectionChrome } from '@msqdx/ui'

type Props = {
  title: string
  eyebrow?: string
  infoTooltip?: string
  infoTooltipAriaLabel?: string
  children: ReactNode
  action?: ReactNode
  as?: 'h2' | 'h3'
}

/** Magazine band for EQC results — SectionChrome, no UiBlockSurface bridge. */
export function EventQuickCheckDashboardPanel({
  title,
  eyebrow,
  infoTooltip,
  infoTooltipAriaLabel,
  children,
  action,
  as = 'h2',
}: Props) {
  const meta =
    eyebrow || infoTooltip ? (
      <span className="plexon-eqc-band-meta">
        {eyebrow ? <span>{eyebrow}</span> : null}
        {infoTooltip ? (
          <span
            className="plexon-eqc-help"
            title={infoTooltip}
            aria-label={infoTooltipAriaLabel ?? title}
          >
            i
          </span>
        ) : null}
      </span>
    ) : undefined

  return (
    <section className="plexon-eqc-band plexon-dash-band" data-section="eqc-results-band">
      <SectionChrome title={title} meta={meta} action={action} as={as} quiet />
      <div className="plexon-eqc-band-body">{children}</div>
    </section>
  )
}
