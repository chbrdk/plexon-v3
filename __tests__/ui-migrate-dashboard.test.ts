import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const page = readFileSync(path.join(root, 'app/page.tsx'), 'utf8')

describe('dashboard ui migrate (wave 1)', () => {
  it('uses @msqdx/ui and no legacy DS imports', () => {
    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('SectionChrome')
    expect(page).not.toContain("from '@msqdx/react'")
    expect(page).not.toContain("from '@mui/material'")
  })

  it('keeps magazine shell + product catalog', () => {
    expect(page).toContain('plexon-magazine')
    expect(page).toContain('ProductCatalog')
    expect(page).toContain("t('dashboard.title')")
  })
})
