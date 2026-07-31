import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const page = readFileSync(path.join(root, 'app/projects/[platformProjectId]/page.tsx'), 'utf8')
const dashboard = readFileSync(
  path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
  'utf8',
)
const catalog = readFileSync(path.join(root, 'components/products/ProductCatalog.tsx'), 'utf8')
const productsPage = readFileSync(path.join(root, 'app/products/page.tsx'), 'utf8')

describe('products ui rebuild (wave 3)', () => {
  it('catalog stays on @msqdx/ui without legacy imports', () => {
    expect(productsPage).toContain("from '@msqdx/ui'")
    expect(productsPage).toContain('SectionChrome')
    expect(productsPage).not.toContain("from '@msqdx/react'")
    expect(productsPage).not.toContain("from '@mui/material'")
    expect(catalog).toContain("from '@msqdx/ui'")
    expect(catalog).not.toContain("from '@msqdx/react'")
    expect(catalog).not.toContain("from '@mui/material'")
  })

  it('platform project detail uses SectionChrome/Panel and no legacy DS', () => {
    expect(page).toContain('PlatformProjectDashboard')
    expect(page).not.toContain("from '@msqdx/react'")
    expect(page).not.toContain("from '@mui/material'")
    expect(dashboard).toContain("from '@msqdx/ui'")
    expect(dashboard).toContain('SectionChrome')
    expect(dashboard).toContain('Panel')
    expect(dashboard).toContain('StatLede')
    expect(dashboard).toContain('apiPlatformProjectDashboard')
    expect(dashboard).not.toContain("from '@msqdx/react'")
    expect(dashboard).not.toContain("from '@mui/material'")
  })
})
