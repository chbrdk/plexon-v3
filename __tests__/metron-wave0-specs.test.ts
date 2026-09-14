import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('METRON Wave 0 plexon companions', () => {
  it('locks product id and Phase 8 done row', () => {
    const capability = readFileSync(path.join(root, 'specs/domain/metron-capability.md'), 'utf8')
    expect(capability).toContain('`metron`')
    expect(capability).toContain('METRON')
    expect(capability).toContain('2026-05-plexon-federation-v3')
    expect(capability).toContain('metron-project-origin')

    const collections = readFileSync(
      path.join(root, 'specs/domain/collection-projects.md'),
      'utf8',
    )
    expect(collections).toContain('8 METRON capability mirror')
    expect(collections).toContain('product id `metron`')
    expect(collections).toContain('metron-v3')
    expect(collections).toContain('**done (Wave 2)**')

    const onboarding = readFileSync(path.join(root, 'knowledge/metron-v3-onboarding.md'), 'utf8')
    expect(onboarding).toContain('Product id | `metron`')
    expect(onboarding).toContain('Wave 0')
    expect(onboarding).toContain('**done**')

    const fit = readFileSync(path.join(root, 'knowledge/metron-ecosystem-fit.md'), 'utf8')
    expect(fit).toContain('product id `metron`')
    expect(fit).toContain('Wave 0')
    expect(fit).toContain('**done**')

    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    expect(paths).toContain('NEXT_PUBLIC_METRON_URL')
    expect(paths).toContain('localhost:3011')
    expect(paths).toContain('metron-v3-onboarding.md')

    expect(existsSync(path.join(root, 'specs/domain/metron-capability.md'))).toBe(true)
  })

  it('registers metron in PLATFORM_PRODUCT_IDS (Wave 2)', () => {
    const entitlements = readFileSync(path.join(root, 'lib/platform-entitlements.ts'), 'utf8')
    expect(entitlements).toMatch(/['"]metron['"]/)
  })
})
