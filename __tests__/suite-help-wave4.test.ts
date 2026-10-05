/**
 * Suite Docs & Help — Wave 4 CHECKION tutorial → articles.
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

const WAVE4_PUBLIC = [
  'checkion.getting-started',
  'checkion.scan.domain-deep',
  'checkion.scan.seo-crawl',
  'checkion.scan.wcag-quick',
] as const

describe('suite help Wave 4 CHECKION corpus', () => {
  clearHelpManifestCache()
  clearHelpWalkthroughCache()

  it('ships bilingual Wave 4 articles with public visibility (except geo)', () => {
    for (const id of WAVE4_PUBLIC) {
      expect(existsSync(path.join(root, `content/help/articles/${id}.en.md`))).toBe(true)
      expect(existsSync(path.join(root, `content/help/articles/${id}.de.md`))).toBe(true)
      const en = getHelpArticle({ id, locale: 'en', access: 'anonymous', visibilityCeiling: 'public' })
      expect(en?.body.length, id).toBeGreaterThan(80)
      expect(en?.visibility).toBe('public')
    }

    const geoPublic = getHelpArticle({
      id: 'checkion.scan.geo-layers',
      locale: 'en',
      access: 'anonymous',
      visibilityCeiling: 'public',
    })
    expect(geoPublic).toBeNull()

    const geoAuth = getHelpArticle({
      id: 'checkion.scan.geo-layers',
      locale: 'de',
      access: 'authenticated',
    })
    expect(geoAuth?.body).toMatch(/Model memory/i)
  })

  it('lists getting-started for checkion context and walkthrough', () => {
    const articles = listHelpArticles({
      locale: 'en',
      access: 'authenticated',
      product: 'checkion',
    })
    expect(articles.some((a) => a.id === 'checkion.getting-started')).toBe(true)

    const wts = listHelpWalkthroughs({
      locale: 'en',
      product: 'checkion',
      pathname: '/scans',
    })
    expect(wts.some((w) => w.id === 'checkion.getting-started.path')).toBe(true)
  })

  it('documents Wave 4 in spec + tutorial index', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/suite-help-docs.md'), 'utf8')
    expect(spec).toContain('Wave 4')
    expect(spec).toContain('checkion.getting-started')
    const tutorials = readFileSync(
      path.join(root, 'knowledge/tutorials/checkion-first-five.md'),
      'utf8',
    )
    expect(tutorials).toContain('checkion.scan.domain-deep')
    expect(tutorials).toContain('content/help/')
  })
})
