/**
 * Magazine-shell configuration for PLEXON v3.
 * Route string constants remain in `lib/constants.ts` and `lib/paths/*`.
 */

import {
  PATH_ADMIN,
  PATH_ASSISTANT,
  PATH_BOARD,
  PATH_DESIGN_SYSTEM,
  PATH_EVENT_QUICK_CHECK,
  PATH_FORGOT_PASSWORD,
  PATH_HOME,
  PATH_LOGIN,
  PATH_PRODUCTS,
  PATH_REGISTER,
  PATH_RESET_PASSWORD,
  PATH_SETTINGS,
} from '@/lib/constants'

export const shellPaths = {
  railInsetRem: 1,
  railGapRem: 4,
  railWidthRem: 4.25,
  mainGutterRem: 2.5,
  railDockEdge: 'left' as const,
  railDockStorageKey: 'plexon.v3.railDock',
  brandCornerRadiusPx: 32,
  devPort: 3334,
  defaultDisplayName: 'PLEXON',
  defaultTheme: 'msqdx-dark' as const,
  defaultLocale: 'en' as const,
  themeChoices: ['msqdx', 'msqdx-dark', 'msqdx-v2', 'msqdx-v2-dark'] as const,
  localeChoices: ['en', 'de'] as const,
  routes: {
    home: PATH_HOME,
    login: PATH_LOGIN,
    register: PATH_REGISTER,
    forgotPassword: PATH_FORGOT_PASSWORD,
    resetPassword: PATH_RESET_PASSWORD,
    products: PATH_PRODUCTS,
    settings: PATH_SETTINGS,
    assistant: PATH_ASSISTANT,
    eventQuickCheck: PATH_EVENT_QUICK_CHECK,
    board: PATH_BOARD,
    designSystem: PATH_DESIGN_SYSTEM,
    admin: PATH_ADMIN,
  },
} as const

/** @deprecated Prefer `shellPaths` — alias kept for audion-style imports during cutover. */
export const paths = shellPaths

export type PlexonShellPaths = typeof shellPaths
