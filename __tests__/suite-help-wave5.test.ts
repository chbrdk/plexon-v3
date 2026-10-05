/**
 * Suite Docs & Help — Wave 5 BRANDION tutorial → articles.
 * Spec: specs/domain/suite-help-docs.md
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  clearHelpManifestCache,
  getHelpArticle,
  listHelpArticles,
} from '@/lib/help/content'
import {
  clearHelpWalkthroughCache,
  listHelpWalkthroughs,
} from '@/lib/help/walkthroughs'

const root = path.resolve(__dirname, '..')

const WAVE5_PUBLIC = [
  'brandion.getting-started',
  'brandion.guidelines.activate',
  'brandion.analysis.measured-evaluate',
] as const

describe('suite help Wave 5 BRANDION corpus', () => {
  clearHelpManifestCache()
  clearHelpWalkthroughCache()

  it('ships bilingual Brandion articles as public', () => {
    for (const id of WAVE5_PUBLIC) {
      expect(existsSync(path.join(root, `content/help/articles/${id}.en.md`))).toBe(true)
      expect(existsSync(path.join(root, `content/help/articles/${id}.de.md`))).toBe(true)
      const en = getHelpArticle({
        id,
        locale: 'en',
        access: 'anonymous',
        visibilityCeiling: 'public',
      })
      expect(en?.visibility, id).toBe('public')
      expect(en?.body.length, id).toBeGreaterThan(80)
    }

    const de = getHelpArticle({
      id: 'brandion.analysis.measured-evaluate',
      locale: 'de',
      access: 'anonymous',
      visibilityCeiling: 'public',
    })
    expect(de?.body).toMatch(/Measured evaluate/i)
    expect(de?.body).not.toMatch(/gl-msrxlt4u/)
  })

  it('lists Brandion hub articles and walkthrough', () => {
    const articles = listHelpArticles({
      locale: 'en',
      access: 'authenticated',
      product: 'brandion',
    })
    expect(articles.some((a) => a.id === 'brandion.getting-started')).toBe(true)
    expect(articles.some((a) => a.id === 'brandion.guidelines.activate')).toBe(true)

    const wts = listHelpWalkthroughs({
      locale: 'de',
      product: 'brandion',
      pathname: '/analysis',
    })
    expect(wts.some((w) => w.id === 'brandion.getting-started.path')).toBe(true)
  })

  it('documents Wave 5 in spec + tutorial index', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/suite-help-docs.md'), 'utf8')
    expect(spec).toContain('Wave 5')
    expect(spec).toContain('brandion.getting-started')
    const tutorials = readFileSync(
      path.join(root, 'knowledge/tutorials/brandion-first-two.md'),
      'utf8',
    )
    expect(tutorials).toContain('brandion.guidelines.activate')
    expect(tutorials).toContain('content/help/')
  })
})
