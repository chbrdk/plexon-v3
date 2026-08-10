'use client'

import { Text } from '@msqdx/ui'

type UiMetricValueProps = {
  value: string | number
  unit?: string
}

export function UiMetricValue({ value, unit }: UiMetricValueProps) {
  return (
    <Text role="numeric" as="p" className="plexon-assistant-metric-value">
      {value}
      {unit ? (
        <Text role="meta" as="span" className="plexon-assistant-metric-unit">
          {unit}
        </Text>
      ) : null}
    </Text>
  )
}
