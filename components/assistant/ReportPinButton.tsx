'use client';

import { IconButton, Tooltip } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';

type ReportPinButtonProps = {
  pinned: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onToggle: () => void;
};

export function ReportPinButton({ pinned, disabled, disabledReason, onToggle }: ReportPinButtonProps) {
  const { t } = useI18n();
  const label = disabled
    ? disabledReason ?? t('assistant.report.pinDisabled')
    : pinned
      ? t('assistant.report.unpin')
      : t('assistant.report.pin');

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          sx={{
            color: pinned ? 'var(--color-text-on-light)' : 'var(--color-text-muted-on-light)',
            bgcolor: pinned ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
            '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.08)' },
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {pinned ? 'bookmark' : 'bookmark_add'}
          </span>
        </IconButton>
      </span>
    </Tooltip>
  );
}
