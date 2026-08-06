import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { SUGGESTABLE_FACETS } from '../lib/assistant/knowledge-pack/research-knowledge-pack'

const root = path.resolve(__dirname, '..')

describe('collection knowledge pack (implementation)', () => {
  const required = [
    'specs/domain/collection-knowledge-pack.md',
    'specs/api/collection-knowledge-pack.md',
    'lib/collection-knowledge-pack.ts',
    'lib/db/collection-knowledge-packs.ts',
    'lib/assistant/knowledge-pack/research-knowledge-pack.ts',
    'app/api/platform/projects/[platformProjectId]/knowledge/route.ts',
    'app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/route.ts',
    'app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/publish/route.ts',
    'app/api/platform/projects/[platformProjectId]/knowledge/suggest/route.ts',
    'components/products/CollectionKnowledgeBand.tsx',
    'lib/db/migrations/0004_collection_knowledge_packs.sql',
  ] as const

  it('keeps knowledge pack specs and implementation on disk', () => {
    for (const rel of required) {
      expect(existsSync(path.join(root, rel)), `missing ${rel}`).toBe(true)
    }
  })

  it('documents facets, dedicated storage, and non-upsert rule', () => {
    const domain = readFileSync(
      path.join(root, 'specs/domain/collection-knowledge-pack.md'),
      'utf8',
    )
    const api = readFileSync(path.join(root, 'specs/api/collection-knowledge-pack.md'), 'utf8')
    const schema = readFileSync(path.join(root, 'lib/db/schema.ts'), 'utf8')
    const upsert = readFileSync(path.join(root, 'lib/platform-project-upsert.ts'), 'utf8')
    expect(domain).toContain('research_brief')
    expect(domain).toContain('geo_context')
    expect(domain).toContain('reserved')
    expect(domain).toContain('collection_knowledge_packs')
    expect(schema).toContain('collectionKnowledgePacks')
    expect(upsert).not.toContain('knowledgePack')
    expect(api).toContain('/api/platform/projects/:platformProjectId/knowledge')
    expect(api).toContain('/knowledge/suggest')
    expect(api).toContain('PlatformProjectUpsertPayload')
  })

  it('Collection detail uses magazine knowledge band with AI suggest', () => {
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8',
    )
    const band = readFileSync(
      path.join(root, 'components/products/CollectionKnowledgeBand.tsx'),
      'utf8',
    )
    const overview = readFileSync(
      path.join(root, 'components/products/CollectionOverviewBand.tsx'),
      'utf8',
    )
    const domain = readFileSync(
      path.join(root, 'specs/domain/collection-knowledge-pack.md'),
      'utf8',
    )
    expect(dash).toContain('CollectionKnowledgeBand')
    expect(dash).toContain('CollectionOverviewBand')
    expect(overview).toContain('data-section="collection-overview"')
    expect(overview).toContain('StatLede')
    expect(overview).not.toMatch(/@mui\//)
    expect(domain).toContain('Overview magazine')
    expect(domain).toContain('Arbeitstiefe')
    expect(domain).toContain('collection-overview')
    expect(band).toContain('plexon-knowledge-band')
    expect(band).toContain('plexon-knowledge-facet-tile')
    expect(band).toContain('apiPlatformProjectKnowledgeSuggest')
    expect(band).toContain('knowledgeSuggestAll')
    expect(band).toContain('plexon-edit-dialog')
    expect(band).not.toContain('Accordion')
    expect(band).not.toContain('Invalid JSON')
    expect(band).toContain('profileForm')
    expect(band).toContain('knowledgeBrandReserved')
    expect(band).toContain('data-section="collection-magazine"')
    expect(band).toContain('CheckionCapabilityView')
    expect(band).toContain('AudionCapabilityView')
    expect(band).toContain('navCheckion')
    expect(dash).toContain('bindings={data.bindings}')
    expect(dash).toContain('onOpenWork')
    expect(dash).not.toContain('plexon-project-capability-strip')
    expect(band).not.toMatch(/@mui\//)
    expect(dash).not.toMatch(/@mui\//)
  })

  it('indexes pack and companions from collection-projects + ownership', () => {
    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8')
    const collection = readFileSync(
      path.join(root, 'specs/domain/collection-projects.md'),
      'utf8',
    )
    const ownership = readFileSync(
      path.join(root, 'knowledge/platform-surface-ownership.md'),
      'utf8',
    )
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    expect(index).toContain('collection-knowledge-pack.md')
    expect(collection).toContain('collection-knowledge-pack.md')
    expect(ownership).toContain('Collection Knowledge Pack')
    expect(paths).toContain('apiPlatformProjectKnowledge')
    expect(paths).toContain('apiPlatformProjectKnowledgeSuggest')
    expect(paths).toContain('CollectionOverviewBand')
    expect(constants).toContain('apiPlatformProjectKnowledge')
    expect(constants).toContain('apiPlatformProjectKnowledgeSuggest')
  })

  it('buildKnowledgeFacetReadiness marks brand reserved and empties', async () => {
    const { buildKnowledgeFacetReadiness, createEmptyFacets } = await import(
      '../lib/collection-knowledge-pack'
    )
    const readiness = buildKnowledgeFacetReadiness(createEmptyFacets())
    expect(readiness.find((r) => r.facetId === 'brand')?.status).toBe('reserved')
    expect(readiness.find((r) => r.facetId === 'profile')?.status).toBe('empty')
  })

  it('suggestable facets never include brand', () => {
    expect(SUGGESTABLE_FACETS).toContain('profile')
    expect(SUGGESTABLE_FACETS).toContain('sources')
    expect(SUGGESTABLE_FACETS).not.toContain('brand')
  })
})
