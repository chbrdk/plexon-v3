import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

function collectTsx(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...collectTsx(full))
    else if (name.endsWith('.tsx')) out.push(full)
  }
  return out
}

const adminFiles = [
  ...collectTsx(path.join(root, 'app/admin')),
  ...collectTsx(path.join(root, 'components/admin')),
].filter((f) => !f.includes(`${path.sep}api${path.sep}`))

describe('admin ui rebuild (wave 4)', () => {
  it('has no @mui or @msqdx/react in admin UI file set', () => {
    expect(adminFiles.length).toBeGreaterThan(3)
    for (const file of adminFiles) {
      const src = readFileSync(file, 'utf8')
      expect(src, file).not.toContain("from '@msqdx/react'")
      expect(src, file).not.toContain("from '@mui/material'")
    }
  })

  it('overview uses SectionChrome and StatLede', () => {
    const page = readFileSync(path.join(root, 'app/admin/page.tsx'), 'utf8')
    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('SectionChrome')
    expect(page).toContain('StatLede')
    expect(page).toContain('API_ADMIN_COMPANIES')
    expect(page).toContain('API_ADMIN_USERS')
  })

  it('users and companies keep list APIs and Field chrome', () => {
    const users = readFileSync(path.join(root, 'app/admin/users/page.tsx'), 'utf8')
    const companies = readFileSync(path.join(root, 'app/admin/companies/page.tsx'), 'utf8')
    expect(users).toContain('API_ADMIN_USERS')
    expect(users).toContain('Field')
    expect(users).toContain('plexon-admin-table')
    expect(companies).toContain('API_ADMIN_COMPANIES_BULK')
    expect(companies).toContain('Field')
    expect(companies).toContain('plexon-admin-table')
  })

  it('company detail keeps members/projects/sync capabilities', () => {
    const detail = readFileSync(
      path.join(root, 'app/admin/companies/[companyId]/page.tsx'),
      'utf8',
    )
    expect(detail).toContain('apiAdminCompanyMembers')
    expect(detail).toContain('apiAdminCompanyPlatformProjects')
    expect(detail).toContain('apiAdminPlatformProjectSync')
    expect(detail).toContain('Select')
    expect(detail).toContain('SectionChrome')
  })
})
