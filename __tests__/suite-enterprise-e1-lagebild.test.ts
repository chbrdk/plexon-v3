/**
 * Enterprise E1 — Collection Lagebild surfaces.
 * Spec: specs/domain/suite-enterprise-program.md § E1
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '..')

describe('suite enterprise E1 lagebild', () => {
  it('keeps program + knowledge specs on disk', () => {
    for (const rel of [
      'specs/domain/suite-enterprise-program.md',
      'knowledge/suite-enterprise-program.md',
      'components/projects/CollectionTeamPanel.tsx',
      'components/projects/CollectionActivityBand.tsx',
    ]) {
      expect(existsSync(path.join(root, rel)), `missing ${rel}`).toBe(true)
    }
  })

  it('wires team + activity + creation/videon/spirion/echon panes on Collection home', () => {
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8',
    )
    expect(dash).toContain('CollectionTeamPanel')
    expect(dash).toContain('CollectionActivityBand')
    expect(dash).toContain('creationHref')
    expect(dash).toContain('videonHref')
    expect(dash).toContain('spirionHref')
    expect(dash).toContain('echonHref')

    const band = readFileSync(
      path.join(root, 'components/products/CollectionKnowledgeBand.tsx'),
      'utf8',
    )
    expect(band).toContain("'creation'")
    expect(band).toContain("'videon'")
    expect(band).toContain("'spirion'")
    expect(band).toContain("'echon'")
    expect(band).toContain('CreationCapabilityView')
    expect(band).toContain('BoundProductCapabilityView')

    const views = readFileSync(
      path.join(root, 'components/products/CollectionCapabilityViews.tsx'),
      'utf8',
    )
    expect(views).toContain('CreationCapabilityView')
    expect(views).toContain('BoundProductCapabilityView')
    // Entry CTA even without last run / empty catalog (Härte-Backlog)
    expect(views).toContain('capability-entry-teaser')
    expect(views).toContain('capabilityEntryAlways')
    expect(views).toContain("data-testid={`${productId}-capability-view`}")
    expect(views).toContain('data-testid="creation-capability-view"')
    expect(views).toContain('creationCatalogEmpty')
  })

  it('knowledge band always lists creation/videon/spirion/echon nav ids', () => {
    const band = readFileSync(
      path.join(root, 'components/products/CollectionKnowledgeBand.tsx'),
      'utf8',
    )
    expect(band).toMatch(/CAPABILITY_NAV_IDS[\s\S]*'creation'/)
    expect(band).toContain("'videon'")
    expect(band).toContain("'spirion'")
    expect(band).toContain("'echon'")
  })

  it('dashboard API exposes creation + companion launch links', () => {
    const route = readFileSync(
      path.join(root, 'app/api/platform/projects/[platformProjectId]/dashboard/route.ts'),
      'utf8',
    )
    expect(route).toContain('creation')
    expect(route).toContain('videonProject')
    expect(route).toContain('spirionProject')
    expect(route).toContain('echonProject')
    expect(route).toContain('getVideonUrl')
    expect(route).toContain('getEchonUrl')
  })
})
