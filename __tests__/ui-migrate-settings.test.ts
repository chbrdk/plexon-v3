import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const page = readFileSync(path.join(root, 'app/settings/page.tsx'), 'utf8')
const brand = readFileSync(path.join(root, 'components/settings/BrandColorSelector.tsx'), 'utf8')

describe('settings ui rebuild (wave 2)', () => {
  it('uses @msqdx/ui SectionChrome/Field/ToggleGroup and no legacy DS', () => {
    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('SectionChrome')
    expect(page).toContain('ToggleGroup')
    expect(page).toContain('Field')
    expect(page).not.toContain("from '@msqdx/react'")
    expect(page).not.toContain("from '@mui/material'")
  })

  it('keeps profile, password, tokens, and session capabilities', () => {
    expect(page).toContain('API_AUTH_PROFILE')
    expect(page).toContain('API_AUTH_CHANGE_PASSWORD')
    expect(page).toContain('API_AUTH_TOKENS')
    expect(page).toContain('signOut')
    expect(page).toContain('BrandColorSelector')
  })

  it('brand selector has no @msqdx/react', () => {
    expect(brand).not.toContain("from '@msqdx/react'")
    expect(brand).toContain('plexon-brand-swatch')
  })
})
