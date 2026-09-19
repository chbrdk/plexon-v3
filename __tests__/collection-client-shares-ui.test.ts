import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  apiPlatformProvisioningCollectionClientShare,
  apiPlatformProvisioningCollectionClientShareEventsExport,
  apiPlatformProvisioningCollectionClientSharePolicy,
  apiPlatformProvisioningCollectionClientShares,
} from '../lib/constants'

const root = path.resolve(__dirname, '..')

describe('collection client shares UI (P4)', () => {
  it('panel uses @msqdx/ui and path helpers', () => {
    const src = readFileSync(
      path.join(root, 'components/projects/CollectionClientSharesPanel.tsx'),
      'utf8'
    )
    expect(src).toContain("from '@msqdx/ui'")
    expect(src).not.toContain("from '@mui/material'")
    expect(src).not.toContain("from '@msqdx/react'")
    expect(src).toContain('apiPlatformProvisioningCollectionClientSharePolicy')
    expect(src).toContain('apiPlatformProvisioningCollectionClientShares')
    expect(src).toContain('apiPlatformProvisioningCollectionClientShare')
    expect(src).toContain('data-testid="collection-client-shares-panel"')
  })

  it('Collection detail mounts the panel', () => {
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8'
    )
    expect(dash).toContain('CollectionClientSharesPanel')
  })

  it('locales expose clientShares keys', () => {
    const en = JSON.parse(readFileSync(path.join(root, 'locales/en.json'), 'utf8')) as {
      projects: { detail: { clientShares: Record<string, string> } }
    }
    const de = JSON.parse(readFileSync(path.join(root, 'locales/de.json'), 'utf8')) as {
      projects: { detail: { clientShares: Record<string, string> } }
    }
    expect(en.projects.detail.clientShares.title).toBeTruthy()
    expect(de.projects.detail.clientShares.title).toBeTruthy()
    expect(en.projects.detail.clientShares.revoke).toBeTruthy()
  })

  it('revoke helpers point at provisioning routes', () => {
    expect(apiPlatformProvisioningCollectionClientSharePolicy('col-1')).toBe(
      '/api/platform/provisioning/collections/col-1/client-share-policy'
    )
    expect(apiPlatformProvisioningCollectionClientShares('col-1')).toBe(
      '/api/platform/provisioning/collections/col-1/client-shares'
    )
    expect(apiPlatformProvisioningCollectionClientShare('col-1', 'share-9')).toBe(
      '/api/platform/provisioning/collections/col-1/client-shares/share-9'
    )
  })

  it('lib fans out revoke to Creation service URL', () => {
    const src = readFileSync(path.join(root, 'lib/creation-client-share.ts'), 'utf8')
    expect(src).toContain('pushCreationClientShareRevoke')
    expect(src).toContain('getCreationServiceApiUrl')
    expect(src).toContain('/api/platform/provisioning/collections/')
  })

  it('panel exposes audit CSV export', () => {
    const src = readFileSync(
      path.join(root, 'components/projects/CollectionClientSharesPanel.tsx'),
      'utf8'
    )
    expect(src).toContain('apiPlatformProvisioningCollectionClientShareEventsExport')
    expect(src).toContain('data-testid="client-share-export-audit"')
  })

  it('P5 audit helpers and migration exist', () => {
    const lib = readFileSync(path.join(root, 'lib/creation-client-share.ts'), 'utf8')
    expect(lib).toContain('appendClientShareEvent')
    expect(lib).toContain('exportClientShareEventsCsv')
    expect(lib).toContain('client_share.viewed')
    expect(
      existsSync(path.join(root, 'lib/db/migrations/0018_creation_client_share_events.sql'))
    ).toBe(true)
    expect(apiPlatformProvisioningCollectionClientShareEventsExport('col-1')).toBe(
      '/api/platform/provisioning/collections/col-1/client-share-events/export'
    )
  })
})
