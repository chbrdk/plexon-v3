'use client'

import { Button } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

type ReportPinButtonProps = {
  pinned: boolean
  disabled?: boolean
  disabledReason?: string
  onToggle: () => void
}

export function ReportPinButton({ pinned, disabled, disabledReason, onToggle }: ReportPinButtonProps) {
  const { t } = useI18n()
  const label = disabled
    ? disabledReason ?? t('assistant.report.pinDisabled')
    : pinned
      ? t('assistant.report.unpin')
      : t('assistant.report.pin')

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={`plexon-assistant-pin${pinned ? ' is-pinned' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {pinned ? '★' : '☆'}
    </Button>
  )
}
