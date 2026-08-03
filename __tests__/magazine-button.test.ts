import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('magazine Button cutover', () => {
  it('admin and project links wrap Button instead of raw ds-btn classes', () => {
    const files = [
      'app/admin/page.tsx',
      'app/admin/users/page.tsx',
      'app/admin/companies/page.tsx',
      'app/admin/companies/[companyId]/page.tsx',
      'components/products/PlatformProjectDashboard.tsx',
    ]
    for (const rel of files) {
      const src = readFileSync(path.join(root, rel), 'utf8')
      expect(src, rel).toContain('Button')
      expect(src, rel).not.toMatch(/className="ds-btn/)
    }
  })
})
