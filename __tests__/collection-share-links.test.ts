/**
 * Collection Share Links hub smoke.
 * Spec: specs/domain/collection-share-links.md
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  apiPlatformProvisioningCollectionShareLink,
  apiPlatformProvisioningCollectionShareLinks,
} from '@/lib/constants'
import {
  COLLECTION_SHARE_LINK_KINDS,
  COLLECTION_SHARE_LINK_PRODUCT_IDS,
} from '@/lib/db/schema'

const root = path.join(__dirname, '..')

describe('collection share links hub', () => {
  it('ships migration + lib + routes + panel', () => {
    for (const rel of [
      'lib/db/migrations/0022_collection_share_links.sql',
      'lib/collection-share-links.ts',
      'specs/domain/collection-share-links.md',
      'app/api/platform/provisioning/collections/[platformProjectId]/share-links/route.ts',
      'app/api/platform/provisioning/collections/[platformProjectId]/share-links/[shareId]/route.ts',
      'components/projects/CollectionShareLinksPanel.tsx',
    ]) {
      expect(existsSync(path.join(root, rel)), `missing ${rel}`).toBe(true)
    }
  })

  it('defines closed product ids and kinds', () => {
    expect(COLLECTION_SHARE_LINK_PRODUCT_IDS).toContain('creation')
    expect(COLLECTION_SHARE_LINK_PRODUCT_IDS).toContain('metron')
    expect(COLLECTION_SHARE_LINK_PRODUCT_IDS).toContain('plexon')
    expect(COLLECTION_SHARE_LINK_PRODUCT_IDS).toContain('checkion')
    expect(COLLECTION_SHARE_LINK_PRODUCT_IDS).toContain('brandion')
    expect(COLLECTION_SHARE_LINK_PRODUCT_IDS).toContain('videon')
    expect(COLLECTION_SHARE_LINK_KINDS).toContain('client_page')
    expect(COLLECTION_SHARE_LINK_KINDS).toContain('quick_check')
    expect(COLLECTION_SHARE_LINK_KINDS).toContain('dashboard')
    expect(COLLECTION_SHARE_LINK_KINDS).toContain('scan_overview')
    expect(COLLECTION_SHARE_LINK_KINDS).toContain('brand_findings')
    expect(COLLECTION_SHARE_LINK_KINDS).toContain('cut')
  })

  it('exposes path helpers', () => {
    expect(apiPlatformProvisioningCollectionShareLinks('col-1')).toBe(
      '/api/platform/provisioning/collections/col-1/share-links'
    )
    expect(apiPlatformProvisioningCollectionShareLink('col-1', 's9', 'metron')).toBe(
      '/api/platform/provisioning/collections/col-1/share-links/s9?productId=metron'
    )
  })

  it('dashboard hides ClientRoom and mounts ShareLinks', () => {
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8'
    )
    expect(dash).toContain('CollectionShareLinksPanel')
    expect(dash).not.toContain('CollectionClientRoomPanel')
  })

  it('EQC and Metron assistant shares dual-write share links', () => {
    const eqc = readFileSync(
      path.join(root, 'app/api/assistant/event-quick-check/runs/[runId]/share/route.ts'),
      'utf8'
    )
    expect(eqc).toContain('upsertCollectionShareLink')
    expect(eqc).toContain("kind: 'quick_check'")

    const metron = readFileSync(
      path.join(root, 'app/api/assistant/metron/dashboards/share/route.ts'),
      'utf8'
    )
    expect(metron).toContain('upsertCollectionShareLink')
    expect(metron).toContain("kind: 'dashboard'")

    const creation = readFileSync(path.join(root, 'lib/creation-client-share.ts'), 'utf8')
    expect(creation).toContain('dualWriteCreationShareLink')
    expect(creation).toContain('href: input.href')
  })

  it('hub revoke fans out to checkion and metron provisioning', () => {
    const lib = readFileSync(path.join(root, 'lib/collection-share-links.ts'), 'utf8')
    expect(lib).toContain('pushProductShareRevoke')
    expect(lib).toContain("productId === 'checkion'")
    expect(lib).toContain("productId === 'metron'")
    expect(lib).toContain('/share-links/')
    expect(lib).toContain('href: input.href')
  })

  it('enterprise SQL apply list includes 0022', () => {
    const script = readFileSync(
      path.join(root, 'scripts/apply-enterprise-sql-migrations.mjs'),
      'utf8'
    )
    expect(script).toContain('0022_collection_share_links.sql')
  })
})
