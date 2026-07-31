import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('collection projects domain (phase 0)', () => {
  it('spec documents 1A create-both and deferred enforcement', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    expect(spec).toContain('1A')
    expect(spec).toContain('2C')
    expect(spec).toContain('ensureBindingPlaceholders')
    expect(spec).toContain('Phase 1')
    expect(spec).toContain('Out of scope Phase 0')
  })

  it('central-creation knowledge matches Collection always-both target', () => {
    const knowledge = readFileSync(
      path.join(root, 'knowledge/platform-projects-central-creation.md'),
      'utf8',
    )
    expect(knowledge).toContain('collection-projects.md')
    expect(knowledge).toContain('Create invariant (1A)')
    expect(knowledge).toContain('checkion')
    expect(knowledge).toContain('audion')
  })

  it('user-facing copy uses Collection language and legacy labels', () => {
    const en = readFileSync(path.join(root, 'locales/en.json'), 'utf8')
    const de = readFileSync(path.join(root, 'locales/de.json'), 'utf8')
    expect(en).toContain('"platformInsightsTitle": "Your projects"')
    expect(en).toContain('platformInsightsLegacyBadge')
    expect(en).toContain('"productsTitle": "Capabilities"')
    expect(de).toContain('"platformInsightsTitle": "Deine Projekte"')
    expect(de).toContain('platformInsightsLegacyBadge')
    expect(de).toContain('"productsTitle": "Fähigkeiten"')
  })
})
