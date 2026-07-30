'use client';

import type { SxProps, Theme } from '@mui/material';
import { MsqdxIcon, MsqdxIconButton, type MsqdxIconButtonProps } from '@msqdx/react';
import { plexonAssistantIconButtonSx, plexonAssistantIconSx } from '@/lib/plexon-surface-styles';

type AssistantSurfaceIconProps = {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  customSize?: number;
  sx?: SxProps<Theme>;
};

/** Theme-accent Material Symbol for assistant chrome (history, toolbars). */
export function AssistantSurfaceIcon({ name, size = 'xs', customSize, sx }: AssistantSurfaceIconProps) {
  return (
    <MsqdxIcon
      name={name}
      size={size}
      customSize={customSize}
      weight="medium"
      sx={{ ...plexonAssistantIconSx, ...sx }}
    />
  );
}

type AssistantSurfaceIconButtonProps = Omit<MsqdxIconButtonProps, 'children'> & {
  icon: string;
};

/** Icon button with brand-color glyph on off-white assistant surfaces. */
export function AssistantSurfaceIconButton({
  icon,
  size = 'small',
  sx,
  ...props
}: AssistantSurfaceIconButtonProps) {
  return (
    <MsqdxIconButton
      size={size}
      sx={[plexonAssistantIconButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      {...props}
    >
      <AssistantSurfaceIcon name={icon} />
    </MsqdxIconButton>
  );
}
