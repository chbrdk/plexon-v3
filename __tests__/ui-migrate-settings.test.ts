import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const page = readFileSync(path.join(root, 'app/settings/page.tsx'), 'utf8')

describe('settings ui rebuild (wave 2 + polish)', () => {
  it('uses @msqdx/ui SettingsShell / AccentSwatchGroup and no legacy DS', () => {
    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('SettingsShell')
    expect(page).toContain('AccentSwatchGroup')
    expect(page).toContain('ToggleGroup')
    expect(page).toContain('Field')
    expect(page).not.toContain("from '@msqdx/react'")
    expect(page).not.toContain("from '@mui/material'")
    expect(page).not.toContain('BrandColorSelector')
  })

  it('keeps profile, password, tokens, and session capabilities', () => {
    expect(page).toContain('API_AUTH_PROFILE')
    expect(page).toContain('API_AUTH_CHANGE_PASSWORD')
    expect(page).toContain('API_AUTH_TOKENS')
    expect(page).toContain('signOut')
    expect(page).toContain('accentPreference')
  })
})
