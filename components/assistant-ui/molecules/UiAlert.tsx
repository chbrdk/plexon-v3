'use client'

import { Alert, Text, type AlertTone } from '@msqdx/ui'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type UiAlertProps = {
  title?: string
  message: string
  tone?: UiTone
}

function toAlertTone(tone: UiTone): AlertTone {
  if (tone === 'error') return 'error'
  if (tone === 'success') return 'ok'
  return 'info'
}

export function UiAlert({ title, message, tone = 'info' }: UiAlertProps) {
  const displayTitle = title ?? 'Hinweis'

  return (
    <UiBlockSurface title={displayTitle} eyebrow={tone} className={`plexon-assistant-alert is-${tone}`}>
      <Alert tone={toAlertTone(tone)} className="plexon-assistant-alert-body">
        <Text role="body" as="span">
          {message}
        </Text>
      </Alert>
    </UiBlockSurface>
  )
}
