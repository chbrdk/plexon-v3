'use client';

import React from 'react';
import { MsqdxTooltip, MsqdxButton, MsqdxIcon } from '@msqdx/react';

export interface InfoTooltipProps {
  title: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  ariaLabel?: string;
}

export function InfoTooltip({ title, placement = 'top', ariaLabel = 'Information' }: InfoTooltipProps) {
  return (
    <MsqdxTooltip title={title} placement={placement} arrow brandColor="purple">
      <span>
        <MsqdxButton
          variant="text"
          size="small"
          aria-label={ariaLabel}
          sx={{
            minWidth: 0,
            width: 28,
            height: 28,
            p: 0,
            color: 'var(--color-text-muted-on-light)',
            '&:hover': { color: 'var(--color-theme-accent, var(--color-secondary-dx-purple))' },
          }}
        >
          <MsqdxIcon name="Info" size="sm" />
        </MsqdxButton>
      </span>
    </MsqdxTooltip>
  );
}
