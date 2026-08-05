import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const page = readFileSync(path.join(root, 'app/page.tsx'), 'utf8')

describe('dashboard ui migrate (wave 1)', () => {
  it('uses @msqdx/ui and no legacy DS imports', () => {
    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('plexon-dash-band-title')
    expect(page).not.toContain("from '@msqdx/react'")
    expect(page).not.toContain("from '@mui/material'")
  })

  it('keeps magazine shell + product catalog without page SectionChrome', () => {
    expect(page).toContain('plexon-magazine')
    expect(page).toContain('ProductCatalog')
    expect(page).not.toContain('SectionChrome')
    expect(page).toContain("t('dashboard.productsTitle')")
  })

  it('usage band uses magazine dash chrome, not Panel wash', () => {
    expect(page).toContain('data-section="usage"')
    expect(page).toContain('plexon-dash-band')
    expect(page).toContain('plexon-dash-table')
    const usageIdx = page.indexOf('data-section="usage"')
    expect(usageIdx).toBeGreaterThan(-1)
    const usageSlice = page.slice(Math.max(0, usageIdx - 120), usageIdx + 400)
    expect(usageSlice).toContain('plexon-dash-band')
    expect(usageSlice).not.toContain('DashPanel')
  })

  it('routes admin user edit off the dashboard modal onto /admin/users/[id]', () => {
    expect(page).toContain('pathAdminUser')
    expect(page).not.toContain('setEditId')
    expect(page).not.toContain('openEdit')
    expect(page).not.toMatch(/editId\s*&&/)

    const editPage = readFileSync(path.join(root, 'app/admin/users/[id]/page.tsx'), 'utf8')
    expect(editPage).toContain('AdminUserEditForm')
    expect(editPage).toContain('PATH_ADMIN_USERS')

    const form = readFileSync(path.join(root, 'components/admin/AdminUserEditForm.tsx'), 'utf8')
    expect(form).toContain("'use client'")
    expect(form).toContain('apiAdminUser')
    expect(form).toContain("from '@msqdx/ui'")

    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    expect(constants).toContain('export const pathAdminUser')
    expect(constants).toMatch(/pathAdminUserEditOnDashboard[\s\S]*pathAdminUser/)
  })
})
