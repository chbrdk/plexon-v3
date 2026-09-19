import { describe, expect, it } from 'vitest'
import {
  apiPlatformProvisioningCollectionClientSharePolicy,
  apiPlatformProvisioningCollectionClientShares,
} from '../lib/constants'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('creation client share P2', () => {
  it('defaults deny public link and allow live/email', () => {
    const src = readFileSync(path.join(root, 'lib/client-share-policy-merge.ts'), 'utf8')
    expect(src).toContain('allowPublicLink: false')
    expect(src).toContain('requirePassword: true')
    expect(src).toContain('allowLiveHead: true')
    expect(src).toContain('allowEmailAllowlist: true')
  })

  it('exposes policy + inventory path helpers', () => {
    expect(apiPlatformProvisioningCollectionClientSharePolicy('col-1')).toBe(
      '/api/platform/provisioning/collections/col-1/client-share-policy'
    )
    expect(apiPlatformProvisioningCollectionClientShares('col-1')).toBe(
      '/api/platform/provisioning/collections/col-1/client-shares'
    )
  })

  it('migration 0017 exists', () => {
    const mig = path.join(root, 'lib/db/migrations/0017_creation_client_share.sql')
    expect(existsSync(mig)).toBe(true)
    const text = readFileSync(mig, 'utf8')
    expect(text).toContain('collection_client_share_policies')
    expect(text).toContain('creation_client_share_projections')
  })
})
