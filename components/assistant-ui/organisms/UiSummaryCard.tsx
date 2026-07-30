'use client';

import { Box } from '@mui/material';
import { MsqdxIcon, MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type { summaryCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiLink } from '@/components/assistant-ui/atoms/UiLink';
import { useI18n } from '@/components/i18n/I18nProvider';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { brandTint, uiStatPillSx } from '@/lib/assistant/ui-visual';
import { uiMonoLabelSx, uiSansDisplaySx } from '@/lib/assistant/ui-typography';

type Props = z.infer<typeof summaryCardPropsSchema>;

function SummaryStat({
  icon,
  label,
  value,
  brand,
}: {
  icon: string;
  label: string;
  value: string;
  brand: 'green' | 'pink';
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 140,
        p: 1.5,
        borderRadius: `${MSQDX_SPACING.borderRadius.sm}px`,
        bgcolor: brandTint(brand, 0.1),
        border: `1px solid ${brandTint(brand, 0.28)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <MsqdxIcon name={icon as 'travel_explore'} customSize={18} />
        <MsqdxTypography
          variant="caption"
          sx={uiMonoLabelSx}
        >
          {label}
        </MsqdxTypography>
      </Box>
      <MsqdxTypography variant="h5" sx={uiSansDisplaySx}>
        {value}
      </MsqdxTypography>
    </Box>
  );
}

export function UiSummaryCard({ title, checkionScanCount, audionPersonaCount, links }: Props) {
  const { t } = useI18n();
  const empty = t('assistant.ui.summaryEmpty');

  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.summary_card} brandColor="orange" accent="orange">
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: links?.length ? 1.5 : 0 }}>
        <SummaryStat
          icon="travel_explore"
          label="CHECKION"
          value={checkionScanCount != null ? String(checkionScanCount) : empty}
          brand="green"
        />
        <SummaryStat
          icon="face"
          label="AUDION"
          value={audionPersonaCount != null ? String(audionPersonaCount) : empty}
          brand="pink"
        />
      </Box>
      {links && links.length > 0 ? (
        <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
          {links.map((link) => (
            <Box
              component="li"
              key={link.href + link.label}
              sx={{
                mb: 0.5,
                width: 'fit-content',
                ...uiStatPillSx('green'),
              }}
            >
              <MsqdxIcon name={link.external ? 'open_in_new' : 'arrow_forward'} customSize={14} />
              <UiLink href={link.href} label={link.label} external={link.external} />
            </Box>
          ))}
        </Box>
      ) : null}
    </UiBlockSurface>
  );
}
