'use client';

import { Box } from '@mui/material';
import { MsqdxCard } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { plexonLightCardSx } from '@/lib/plexon-surface-styles';
import { UI_TONE_BRAND, uiMetricTileAccentSx } from '@/lib/assistant/ui-visual';
import type { metricGridPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiBadge } from '@/components/assistant-ui/atoms/UiBadge';
import { UiMetricValue } from '@/components/assistant-ui/atoms/UiMetricValue';
import { UiText } from '@/components/assistant-ui/atoms/UiText';

type MetricItem = z.infer<typeof metricGridPropsSchema>['items'][number];

type UiMetricTileProps = {
  item: MetricItem;
};

export function UiMetricTile({ item }: UiMetricTileProps) {
  const accentBrand = UI_TONE_BRAND[item.tone ?? 'neutral'] ?? 'neutral';
  const msqdxBrand =
    accentBrand === 'neutral' || accentBrand === 'theme' ? undefined : accentBrand;

  return (
    <MsqdxCard
      data-msqdx-surface="light"
      variant="flat"
      borderRadius="md"
      brandColor={msqdxBrand}
      hoverable
      sx={{
        minWidth: 0,
        height: '100%',
        ...plexonLightCardSx,
        bgcolor: 'var(--color-card-bg) !important',
        ...uiMetricTileAccentSx(accentBrand),
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${MSQDX_SPACING.gap.xxs}px`, pb: 0.5 }}>
        <UiText variant="caption" role="label" tone="neutral">
          {item.label}
        </UiText>
        <UiMetricValue value={item.value} unit={item.unit} />
        {item.tone && item.tone !== 'neutral' ? (
          <Box sx={{ mt: 0.5 }}>
            <UiBadge label={item.tone} tone={item.tone} />
          </Box>
        ) : null}
        {item.hint ? (
          <UiText variant="caption" sx={{ opacity: 0.75 }}>
            {item.hint}
          </UiText>
        ) : null}
      </Box>
    </MsqdxCard>
  );
}
