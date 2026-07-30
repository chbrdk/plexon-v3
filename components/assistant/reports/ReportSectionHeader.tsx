'use client';

import { Typography } from '@mui/material';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';

type Props = {
  title: string;
  subtitle?: string;
};

export function ReportSectionHeader({ title, subtitle }: Props) {
  return (
    <>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: MSQDX_TYPOGRAPHY.fontWeight.semibold, mt: 0.5 }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </>
  );
}
