'use client'

import type { ReactNode } from 'react'

/**
 * Theme chrome for PLEXON v3 magazine UI.
 * Visual tokens come from `@msqdx/ui` via `data-theme` on `<html>` — no MUI ThemeProvider.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
