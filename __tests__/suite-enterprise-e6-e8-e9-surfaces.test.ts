/**
 * Enterprise E6/E8/E9 surface inventory.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import {
  COLLECTION_FLOW_TEMPLATE_CRISIS,
  COLLECTION_FLOW_TEMPLATE_FIX_RETEST,
  COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE,
} from '@/lib/collection-test-flow'

const root = path.join(__dirname, '..')

describe('suite enterprise E6 E8 E9 surfaces', () => {
  it('wires persona pages CTA into Audion capability view', () => {
    const src = readFileSync(
      path.join(root, 'components/products/CollectionCapabilityViews.tsx'),
      'utf8'
    )
    expect(src).toContain('persona-pages-cta')
    expect(src).toContain('askPersonaPagesDraft')
    expect(src).toContain('pathAssistantWithProjectAndDraft')
    expect(src).toContain('capability-entry-teaser')
    expect(src).toContain('capabilityEntryAlways')
  })

  it('mounts competitive space band on collection dashboard', () => {
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8'
    )
    expect(dash).toContain('CollectionCompetitiveSpaceBand')
    expect(
      existsSync(path.join(root, 'components/projects/CollectionCompetitiveSpaceBand.tsx'))
    ).toBe(true)
  })

  it('mounts company directory panel on admin company page', () => {
    const page = readFileSync(
      path.join(root, 'app/admin/companies/[companyId]/page.tsx'),
      'utf8'
    )
    expect(page).toContain('CompanyDirectoryPanel')
    expect(existsSync(path.join(root, 'components/admin/CompanyDirectoryPanel.tsx'))).toBe(
      true
    )
  })

  it('exposes enterprise templates in flow gallery CREATE_OPTIONS', () => {
    const gallery = readFileSync(
      path.join(root, 'app/projects/[platformProjectId]/flows/page.tsx'),
      'utf8'
    )
    expect(gallery).toContain('COLLECTION_FLOW_TEMPLATE_CRISIS')
    expect(gallery).toContain('COLLECTION_FLOW_TEMPLATE_FIX_RETEST')
    expect(gallery).toContain('COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE')
    // Constants resolve to these ids at runtime.
    expect(COLLECTION_FLOW_TEMPLATE_CRISIS).toBe('enterprise-crisis-v1')
    expect(COLLECTION_FLOW_TEMPLATE_FIX_RETEST).toBe('enterprise-fix-retest-v1')
    expect(COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE).toBe('enterprise-launch-gate-v1')
  })
})
