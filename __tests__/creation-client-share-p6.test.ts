import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { apiAdminCompanyClientSharePolicy } from '../lib/constants'
import {
  DEFAULT_CLIENT_SHARE_POLICY,
  collectionPolicyLoosensCompany,
  mergeClientSharePolicy,
  type ClientSharePolicy,
} from '../lib/client-share-policy-merge'

const root = path.resolve(__dirname, '..')

describe('creation client share P6 company merge', () => {
  it('merges company ceiling restrictively', () => {
    const company: ClientSharePolicy = {
      ...DEFAULT_CLIENT_SHARE_POLICY,
      allowPublicLink: false,
      requirePassword: true,
      maxTtlDays: 14,
      allowLiveHead: true,
    }
    const collection: ClientSharePolicy = {
      ...DEFAULT_CLIENT_SHARE_POLICY,
      allowPublicLink: true,
      requirePassword: false,
      maxTtlDays: 30,
      allowLiveHead: false,
    }
    const effective = mergeClientSharePolicy(company, collection)
    expect(effective.allowPublicLink).toBe(false)
    expect(effective.requirePassword).toBe(true)
    expect(effective.maxTtlDays).toBe(14)
    expect(effective.allowLiveHead).toBe(false)
  })

  it('inherits company when collection override is null', () => {
    const company: ClientSharePolicy = {
      ...DEFAULT_CLIENT_SHARE_POLICY,
      enabled: false,
    }
    expect(mergeClientSharePolicy(company, null)).toEqual(company)
  })

  it('detects collection loosen attempts', () => {
    const company: ClientSharePolicy = {
      ...DEFAULT_CLIENT_SHARE_POLICY,
      allowPublicLink: false,
      requirePassword: true,
      maxTtlDays: 7,
    }
    expect(
      collectionPolicyLoosensCompany(company, {
        ...company,
        allowPublicLink: true,
      })
    ).toBe('company_disallows_public_link')
    expect(
      collectionPolicyLoosensCompany(company, {
        ...company,
        requirePassword: false,
      })
    ).toBe('company_requires_password')
    expect(
      collectionPolicyLoosensCompany(company, {
        ...company,
        maxTtlDays: 30,
      })
    ).toBe('company_max_ttl')
    expect(collectionPolicyLoosensCompany(company, { ...company, enabled: true })).toBeNull()
  })

  it('exposes admin company policy path and migration', () => {
    expect(apiAdminCompanyClientSharePolicy('co-1')).toBe(
      '/api/admin/companies/co-1/client-share-policy'
    )
    expect(
      existsSync(path.join(root, 'lib/db/migrations/0019_company_client_share_policies.sql'))
    ).toBe(true)
    const panel = readFileSync(
      path.join(root, 'components/admin/CompanyClientSharePolicyPanel.tsx'),
      'utf8'
    )
    expect(panel).toContain('apiAdminCompanyClientSharePolicy')
    expect(panel).toContain('data-testid="company-client-share-policy"')
    const adminPage = readFileSync(
      path.join(root, 'app/admin/companies/[companyId]/page.tsx'),
      'utf8'
    )
    expect(adminPage).toContain('CompanyClientSharePolicyPanel')
  })
})
