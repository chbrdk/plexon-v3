import { alpha, type SxProps, type Theme } from '@mui/material';
import { INPUT_ACCENT_SX_WITH_FALLBACK } from '@/lib/theme-accent';

/** Outer composer strip — pinned to bottom of chat column (flex child, not scroll). */
export const assistantChatComposerBarSx: SxProps<Theme> = {
  padding: { xs: '0.75rem', md: '1rem' },
  borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
  flexShrink: 0,
  width: '100%',
  backgroundColor: 'var(--color-bg-subtle)',
};

/** Fused pill row — AUDION admin chat bar without backdrop blur. */
export function assistantChatComposerPillSx(theme: Theme): SxProps<Theme> {
  return {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
    borderRadius: 9999,
    backgroundColor: 'var(--color-card-bg)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 8px 32px rgba(0,0,0,0.25)'
        : '0 8px 32px rgba(15,23,42,0.08)',
  };
}

/** MsqdxInput nested inside the composer pill — no double border. */
export const assistantChatComposerInputSx = {
  flex: 1,
  minWidth: 0,
  ...INPUT_ACCENT_SX_WITH_FALLBACK,
  '& .msqdx-input-wrapper': {
    ...INPUT_ACCENT_SX_WITH_FALLBACK['& .msqdx-input-wrapper'],
    border: 'none !important',
    borderRadius: 999,
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    minHeight: 44,
    '&:hover': {
      backgroundColor: 'transparent !important',
      border: 'none !important',
    },
    '&.focused': {
      boxShadow: 'none !important',
      border: 'none !important',
    },
  },
  '& .msqdx-input': {
    fontSize: '1rem',
    color: 'var(--color-text-on-light)',
  },
} as const;

export function assistantChatSendButtonSx(
  theme: Theme,
  disabled: boolean
): SxProps<Theme> {
  return {
    flexShrink: 0,
    width: 48,
    height: 48,
    backgroundColor: disabled
      ? alpha(theme.palette.text.primary, 0.18)
      : 'var(--color-secondary-dx-green)',
    color: '#ffffff',
    borderRadius: 999,
    transition: 'background-color 0.2s ease, transform 0.15s ease',
    '&:hover': {
      backgroundColor: disabled
        ? alpha(theme.palette.text.primary, 0.18)
        : 'var(--color-secondary-dx-green)',
      filter: disabled ? 'none' : 'brightness(1.06)',
    },
    '&.Mui-disabled': {
      color: '#ffffff',
      opacity: 0.85,
    },
  };
}

/** Quick-prompt chips on off-white assistant surfaces (not dark MUI default). */
export const assistantSuggestionChipSx: SxProps<Theme> = {
  cursor: 'pointer',
  height: 26,
  borderColor: 'var(--color-theme-accent) !important',
  color: 'var(--color-text-on-light) !important',
  backgroundColor: 'var(--color-card-bg) !important',
  '& .MuiChip-label': {
    color: 'var(--color-text-on-light) !important',
    fontSize: '0.75rem',
    px: 0.75,
  },
  '&:hover': {
    backgroundColor: 'var(--color-theme-accent-tint) !important',
    borderColor: 'var(--color-theme-accent) !important',
  },
  '&.Mui-disabled': {
    opacity: 0.55,
    color: 'var(--color-text-muted-on-light) !important',
    '& .MuiChip-label': {
      color: 'var(--color-text-muted-on-light) !important',
    },
  },
};

/** Outlined prompt buttons (empty state, header) — theme accent, not default green. */
export const assistantPromptOutlinedButtonSx = {
  borderColor: 'var(--color-theme-accent) !important',
  color: 'var(--color-text-on-light) !important',
  backgroundColor: 'var(--color-card-bg) !important',
  textTransform: 'none',
  fontWeight: 500,
  '&:hover': {
    borderColor: 'var(--color-theme-accent) !important',
    backgroundColor: 'var(--color-theme-accent-tint) !important',
  },
  '&.Mui-disabled': {
    borderColor: 'var(--color-secondary-dx-grey-light-tint) !important',
    color: 'var(--color-text-muted-on-light) !important',
  },
};
