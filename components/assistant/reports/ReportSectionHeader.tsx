'use client'

import { Text } from '@msqdx/ui'

type Props = {
  title: string
  subtitle?: string
}

export function ReportSectionHeader({ title, subtitle }: Props) {
  return (
    <div className="plexon-report-section-header">
      <Text role="title" as="h3">
        {title}
      </Text>
      {subtitle ? <Text role="meta">{subtitle}</Text> : null}
    </div>
  )
}
