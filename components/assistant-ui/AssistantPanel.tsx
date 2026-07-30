'use client';

import { Box } from '@mui/material';
import { MsqdxCard, MsqdxIcon, MsqdxIconButton, MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { ASSISTANT_PANEL_MIN_WIDTH } from '@/lib/assistant/ui-constants';
import { AssistantMessageBlocks } from '@/components/assistant-ui/AssistantBlockRenderer';
import { useI18n } from '@/components/i18n/I18nProvider';
import { plexonLightCardSx } from '@/lib/plexon-surface-styles';

type AssistantPanelProps = {
  title?: string;
  blocks: UiBlock[];
  onClose: () => void;
};

export function AssistantPanel({ title, blocks, onClose }: AssistantPanelProps) {
  const { t } = useI18n();
  if (blocks.length === 0) return null;

  return (
    <Box
      sx={{
        width: { xs: '100%', md: ASSISTANT_PANEL_MIN_WIDTH },
        minWidth: { md: ASSISTANT_PANEL_MIN_WIDTH },
        maxWidth: { md: 480 },
        minHeight: 0,
        flexShrink: 0,
        p: { xs: 0, md: `${MSQDX_SPACING.scale.sm}px` },
      }}
    >
      <MsqdxCard
        data-msqdx-surface="light"
        variant="flat"
        borderRadius="button"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          height: '100%',
          ...plexonLightCardSx,
          '& > div:last-of-type': { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: `${MSQDX_SPACING.scale.md}px`,
            py: `${MSQDX_SPACING.scale.sm}px`,
            flexShrink: 0,
          }}
        >
          <MsqdxTypography variant="subtitle2" weight="semibold">
            {title ?? t('assistant.ui.panelDefaultTitle')}
          </MsqdxTypography>
          <MsqdxIconButton
            size="small"
            onClick={onClose}
            aria-label={t('assistant.ui.panelClose')}
          >
            <MsqdxIcon name="close" size="sm" />
          </MsqdxIconButton>
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            px: `${MSQDX_SPACING.scale.md}px`,
            pb: `${MSQDX_SPACING.scale.md}px`,
          }}
        >
          <AssistantMessageBlocks blocks={blocks} inset={false} />
        </Box>
      </MsqdxCard>
    </Box>
  );
}
