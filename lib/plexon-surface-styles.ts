import { MSQDX_NEUTRAL } from '@msqdx/tokens';

/** MSQDX off-white surface — matches `MsqdxAppLayout innerBackground="offwhite"`. */
export const PLEXON_OFFWHITE = MSQDX_NEUTRAL.neutral;

/** Central CSS variable (defined in `styles/globals.css`). */
export const PLEXON_SURFACE_OFFWHITE_CSS = 'var(--color-bg-subtle)';

/**
 * Override MUI dark `palette.paper` on remaining legacy surfaces (board / drawers).
 * Assistant generative UI no longer uses this — Wave 7 uses Panel + CSS tokens.
 */
export const plexonLightCardSx = {
  bgcolor: `${PLEXON_SURFACE_OFFWHITE_CSS} !important`,
  color: 'var(--color-text-on-light)',
  '&:hover': {
    bgcolor: `${PLEXON_SURFACE_OFFWHITE_CSS} !important`,
  },
  '& .MuiTypography-root': {
    color: 'var(--color-text-on-light)',
  },
  '& .MuiTypography-colorTextSecondary': {
    color: 'var(--color-text-muted-on-light) !important',
  },
} as const;

/** @deprecated Wave 7 — step_list uses `.plexon-assistant-steps`; kept empty for import safety. */
export const plexonAssistantStepperSx = {} as const;

/** Assistant chat shell — never use `--color-neutral` (#0f0f0f in dark mode). */
export const plexonAssistantChatShellSx = {
  backgroundColor: PLEXON_SURFACE_OFFWHITE_CSS,
  color: 'var(--color-text-on-light)',
} as const;

/**
 * Force nested MsqdxCard roots (e.g. MsqdxPersonaCard) onto off-white when the DS
 * component does not accept `data-msqdx-surface` itself.
 */
export const plexonForceChildMsqdxCardLightSx = {
  '& > *': {
    bgcolor: `${PLEXON_SURFACE_OFFWHITE_CSS} !important`,
    color: 'var(--color-text-on-light)',
    '&:hover': {
      bgcolor: `${PLEXON_SURFACE_OFFWHITE_CSS} !important`,
    },
    '& .MuiTypography-root': {
      color: 'var(--color-text-on-light)',
    },
    '& .MuiTypography-colorTextSecondary': {
      color: 'var(--color-text-muted-on-light) !important',
    },
  },
} as const;

/** MUI Select / OutlinedInput on off-white assistant surfaces. */
export const plexonLightInputSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'var(--color-card-bg) !important',
    color: 'var(--color-text-on-light) !important',
    border: '1px solid var(--color-secondary-dx-grey-light-tint) !important',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--color-secondary-dx-grey-light-tint) !important',
  },
  '& .MuiSelect-select': {
    color: 'var(--color-text-on-light) !important',
  },
} as const;

/** Assistant report cart drawer — off-white, no dark MUI paper / glass overlay. */
export const plexonAssistantDrawerPaperSx = {
  width: { xs: '100vw', sm: 400 },
  maxWidth: '100vw',
  bgcolor: 'var(--color-bg-subtle) !important',
  color: 'var(--color-text-on-light)',
  backgroundImage: 'none !important',
  borderLeft: '4px solid var(--color-theme-accent)',
  boxShadow: 'none !important',
  '& .MuiTypography-root': {
    color: 'var(--color-text-on-light)',
  },
  '& .MuiTypography-colorTextSecondary': {
    color: 'var(--color-text-muted-on-light) !important',
  },
} as const;

export const plexonAssistantDrawerBackdropSx = {
  bgcolor: 'rgba(15, 23, 42, 0.24)',
  backdropFilter: 'none',
} as const;

/** Material Symbols on off-white assistant chrome — theme accent, one step smaller, centered. */
export const plexonAssistantIconSx = {
  color: 'var(--color-theme-accent)',
  fontFamily: "'Material Symbols Outlined', sans-serif",
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  verticalAlign: 'middle',
} as const;

/**
 * MsqdxIconButton on assistant surfaces — overrides DS white chip + dark-theme icon color.
 */
export const plexonAssistantIconButtonSx = {
  color: 'var(--color-theme-accent) !important',
  backgroundColor: 'var(--color-card-bg) !important',
  border: '1px solid var(--color-secondary-dx-grey-light-tint) !important',
  boxShadow: 'none !important',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 !important',
  '&:hover': {
    backgroundColor: 'var(--color-theme-accent-tint) !important',
    borderColor: 'var(--color-theme-accent) !important',
    color: 'var(--color-theme-accent) !important',
  },
  '& .msqdx-material-symbol, & .material-symbols-outlined': {
    fontFamily: "'Material Symbols Outlined', sans-serif !important",
    color: 'inherit !important',
    display: 'inline-flex !important',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1 !important',
    verticalAlign: 'middle',
    marginTop: '-1px',
  },
} as const;
