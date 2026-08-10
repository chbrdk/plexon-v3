'use client'

import { Text } from '@msqdx/ui'
import type { summaryCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiLink } from '@/components/assistant-ui/atoms/UiLink'
import { useI18n } from '@/components/i18n/I18nProvider'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof summaryCardPropsSchema>

function SummaryStat({
  label,
  value,
  brand,
}: {
  label: string
  value: string
  brand: 'green' | 'pink'
}) {
  return (
    <div className={`plexon-assistant-summary-stat is-${brand}`}>
      <Text role="label" as="span" className="plexon-assistant-summary-stat-label">
        {label}
      </Text>
      <Text role="numeric" as="p" className="plexon-assistant-summary-stat-value">
        {value}
      </Text>
    </div>
  )
}

export function UiSummaryCard({ title, checkionScanCount, audionPersonaCount, links }: Props) {
  const { t } = useI18n()
  const empty = t('assistant.ui.summaryEmpty')

  return (
    <UiBlockSurface title={title} eyebrow="summary" className="plexon-assistant-summary">
      <div className="plexon-assistant-summary-stats">
        <SummaryStat
          label="CHECKION"
          value={checkionScanCount != null ? String(checkionScanCount) : empty}
          brand="green"
        />
        <SummaryStat
          label="AUDION"
          value={audionPersonaCount != null ? String(audionPersonaCount) : empty}
          brand="pink"
        />
      </div>
      {links && links.length > 0 ? (
        <ul className="plexon-assistant-summary-links">
          {links.map((link) => (
            <li key={link.href + link.label} className="plexon-assistant-summary-link">
              <span aria-hidden>{link.external ? '↗' : '→'}</span>
              <UiLink href={link.href} label={link.label} external={link.external} />
            </li>
          ))}
        </ul>
      ) : null}
    </UiBlockSurface>
  )
}
