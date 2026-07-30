'use client';

import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';

type UiLinkProps = {
  href: string;
  label: string;
  external?: boolean;
};

export function UiLink({ href, label, external }: UiLinkProps) {
  return (
    <Box
      component="a"
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      sx={{
        textDecoration: 'none',
        '&:hover .ui-link-label': { color: 'var(--color-theme-accent)' },
      }}
    >
      <MsqdxTypography
        className="ui-link-label"
        variant="body2"
        sx={{
          fontFamily: MSQDX_TYPOGRAPHY.fontFamily.primary,
          color: MSQDX_COLORS.brand.green,
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        {label}
      </MsqdxTypography>
    </Box>
  );
}
