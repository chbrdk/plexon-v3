import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('collection knowledge pack (spec phase)', () => {
  const required = [
    'specs/domain/collection-knowledge-pack.md',
    'specs/api/collection-knowledge-pack.md',
    'knowledge/specs-index.md',
  ] as const

  it('keeps knowledge pack specs and index on disk', () => {
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
    expect(domain).toContain('research_brief')
    expect(domain).toContain('geo_context')
    expect(domain).toContain('reserved')
    expect(domain).toContain('collection_knowledge_packs')
    expect(domain).toContain('dedicated tables')
    expect(domain).toContain('Reject')
    expect(api).toContain('/api/platform/projects/:platformProjectId/knowledge')
    expect(api).toContain('must not')
    expect(api).toContain('PlatformProjectUpsertPayload')
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
    expect(index).toContain('collection-knowledge-pack.md')
    expect(collection).toContain('collection-knowledge-pack.md')
    expect(ownership).toContain('Collection Knowledge Pack')
    expect(paths).toContain('collection-knowledge-pack.md')
  })
})
