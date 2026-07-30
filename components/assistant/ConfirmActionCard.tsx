'use client';

import { Box } from '@mui/material';
import { MsqdxButton, MsqdxCard, MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { plexonLightCardSx } from '@/lib/plexon-surface-styles';
import { useI18n } from '@/components/i18n/I18nProvider';

type PendingConfirmation = {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
};

type ConfirmActionCardProps = {
  pending: PendingConfirmation;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmActionCard({ pending, onConfirm, onCancel }: ConfirmActionCardProps) {
  const { t } = useI18n();

  return (
    <MsqdxCard data-msqdx-surface="light" variant="flat" borderRadius="button" brandColor="orange" sx={plexonLightCardSx}>
      <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
        {t('assistant.confirmAction')}
      </MsqdxTypography>
      <MsqdxTypography variant="body2" sx={{ mb: `${MSQDX_SPACING.scale.sm}px` }}>
        {pending.toolName}
      </MsqdxTypography>
      <Box sx={{ display: 'flex', gap: `${MSQDX_SPACING.gap.sm}px` }}>
        <MsqdxButton size="small" variant="contained" onClick={onConfirm}>
          {t('assistant.confirmYes')}
        </MsqdxButton>
        <MsqdxButton size="small" variant="outlined" onClick={onCancel}>
          {t('assistant.confirmNo')}
        </MsqdxButton>
      </Box>
    </MsqdxCard>
  );
}
