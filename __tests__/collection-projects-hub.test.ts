import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

const hubFiles = [
  'app/projects/page.tsx',
  'components/projects/CollectionProjectCard.tsx',
  'components/projects/CollectionProjectsList.tsx',
  'components/projects/CreateCollectionProjectForm.tsx',
]

describe('collection projects hub', () => {
  it('hub UI has no @mui or @msqdx/react', () => {
    for (const rel of hubFiles) {
      const src = readFileSync(path.join(root, rel), 'utf8')
      expect(src, rel).not.toContain("from '@msqdx/react'")
      expect(src, rel).not.toContain("from '@mui/material'")
      expect(src, rel).toContain("from '@msqdx/ui'")
    }
  })

  it('create form posts to company platform-projects API', () => {
    const form = readFileSync(
      path.join(root, 'components/projects/CreateCollectionProjectForm.tsx'),
      'utf8'
    )
    expect(form).toContain('apiPlatformCompanyPlatformProjects')
    expect(form).toContain('API_PLATFORM_ME_COMPANIES')
    expect(form).toContain('pathPlatformProjectDashboard')
  })

  it('shell nav exposes PATH_PROJECTS', () => {
    const shell = readFileSync(path.join(root, 'components/AppShell.tsx'), 'utf8')
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    expect(constants).toContain("PATH_PROJECTS = '/projects'")
    expect(shell).toContain('PATH_PROJECTS')
    expect(shell).toContain('nav.projects')
  })

  it('me companies API lists user companies', () => {
    const route = readFileSync(
      path.join(root, 'app/api/platform/me/companies/route.ts'),
      'utf8'
    )
    expect(route).toContain('listUserCompanies')
  })
})
