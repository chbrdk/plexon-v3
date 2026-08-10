'use client'

import { Text } from '@msqdx/ui'

type UiKeyValueRowProps = {
  label: string
  value: string | number
  /** @deprecated Ignored — Material icon ligatures dropped in Wave 7. */
  icon?: string
}

export function UiKeyValueRow({ label, value }: UiKeyValueRowProps) {
  return (
    <div className="plexon-assistant-kv-row">
      <Text role="label" as="span" className="plexon-assistant-kv-label">
        {label}
      </Text>
      <Text role="body" as="span" className="plexon-assistant-kv-value">
        {value}
      </Text>
    </div>
  )
}
