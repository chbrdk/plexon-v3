'use client';

import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { uiMonoStatSx, uiSansBodySx } from '@/lib/assistant/ui-typography';

type UiMetricValueProps = {
  value: string | number;
  unit?: string;
};

export function UiMetricValue({ value, unit }: UiMetricValueProps) {
  return (
    <MsqdxTypography variant="h5" sx={{ ...uiMonoStatSx, fontSize: MSQDX_TYPOGRAPHY.fontSize['3xl'] }}>
      {value}
      {unit ? (
        <MsqdxTypography
          component="span"
          variant="body2"
          sx={{
            ml: 0.5,
            ...uiSansBodySx,
            fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
            fontWeight: MSQDX_TYPOGRAPHY.fontWeight.medium,
          }}
        >
          {unit}
        </MsqdxTypography>
      ) : null}
    </MsqdxTypography>
  );
}
