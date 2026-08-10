'use client'

import { Button, Panel, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

type PendingConfirmation = {
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
}

type ConfirmActionCardProps = {
  pending: PendingConfirmation
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmActionCard({ pending, onConfirm, onCancel }: ConfirmActionCardProps) {
  const { t } = useI18n()

  return (
    <Panel className="plexon-assistant-confirm-card" variant="default">
      <Text role="title" as="h3">
        {t('assistant.confirmAction')}
      </Text>
      <Text role="body" as="p" className="plexon-assistant-confirm-tool">
        {pending.toolName}
      </Text>
      <div className="plexon-assistant-confirm-actions">
        <Button size="sm" variant="primary" onClick={onConfirm}>
          {t('assistant.confirmYes')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('assistant.confirmNo')}
        </Button>
      </div>
    </Panel>
  )
}
