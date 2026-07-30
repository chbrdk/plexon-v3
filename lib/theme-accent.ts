/**
 * CSS variables for theme accent (MSQDX). Used by AppShell/Sidebar.
 */
export const THEME_ACCENT = {
  color: 'var(--color-theme-accent)',
  borderColor: 'var(--color-theme-accent)',
  backgroundColor: 'var(--color-theme-accent)',
} as const;

export const THEME_ACCENT_WITH_FALLBACK = {
  color: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
  borderColor: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
  backgroundColor: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
} as const;

/** Outlined MsqdxButton — follows user brand color (`--color-theme-accent`). */
export const THEME_ACCENT_OUTLINED_BUTTON_SX = {
  borderColor: 'var(--color-theme-accent) !important',
  color: 'var(--color-theme-accent) !important',
  backgroundColor: 'var(--color-card-bg) !important',
  '&:hover': {
    borderColor: 'var(--color-theme-accent) !important',
    backgroundColor: 'var(--color-theme-accent-tint) !important',
  },
} as const;

/** Text MsqdxButton — follows user brand color (`--color-theme-accent`). */
export const THEME_ACCENT_TEXT_BUTTON_SX = {
  color: 'var(--color-theme-accent) !important',
  '&:hover': {
    backgroundColor: 'var(--color-theme-accent-tint) !important',
  },
} as const;

/** Meta chips on light surfaces — black label text. */
export const PLEXON_META_CHIP_SX = {
  color: 'var(--color-text-on-light) !important',
  borderColor: 'var(--color-secondary-dx-grey-light-tint) !important',
  backgroundColor: 'var(--color-card-bg) !important',
  '& .MuiChip-label': {
    color: 'var(--color-text-on-light) !important',
  },
} as const;

const THEME_ACCENT_VAR = 'var(--color-theme-accent)';
const THEME_ACCENT_OR_GREEN = 'var(--color-theme-accent, var(--color-secondary-dx-green))';

/** sx for MsqdxInput (msqdx-input-wrapper) with theme accent — AUDION chat composer. */
export const INPUT_ACCENT_SX = {
  '& .msqdx-input-wrapper': {
    borderColor: `${THEME_ACCENT_VAR} !important`,
    '&:hover': { borderColor: `${THEME_ACCENT_VAR} !important` },
    '&.focused': { borderColor: `${THEME_ACCENT_VAR} !important` },
  },
  '& .msqdx-input-label': {
    color: 'var(--color-input-label, var(--color-theme-accent)) !important',
  },
} as const;

/** Like INPUT_ACCENT_SX with green fallback when theme accent is unset. */
export const INPUT_ACCENT_SX_WITH_FALLBACK = {
  '& .msqdx-input-wrapper': {
    borderColor: `${THEME_ACCENT_OR_GREEN} !important`,
    '&:hover': { borderColor: `${THEME_ACCENT_OR_GREEN} !important` },
    '&.focused': { borderColor: `${THEME_ACCENT_OR_GREEN} !important` },
  },
  '& .msqdx-input-label': {
    color: `var(--color-input-label, ${THEME_ACCENT_OR_GREEN}) !important`,
  },
} as const;

/** sx for FormField/Input with theme accent (settings, forms). */
export const FORM_FIELD_ACCENT_SX = {
  '& .MuiOutlinedInput-root': {
    borderColor: 'var(--color-theme-accent) !important',
    '&:hover': { borderColor: 'var(--color-theme-accent) !important' },
    '&.Mui-focused': { borderColor: 'var(--color-theme-accent) !important' },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--color-theme-accent) !important',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'var(--color-input-label, var(--color-theme-accent)) !important',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-input-label, var(--color-theme-accent)) !important',
  },
} as const;
