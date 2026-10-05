/**
 * Suite Docs & Help — Wave 1 content API + ranking contracts.
 * Spec: specs/domain/suite-help-docs.md
 */

import { describe, expect, it } from 'vitest'
import {
  clearHelpManifestCache,
  getHelpArticle,
  listHelpArticles,
  rankHelpContext,
  visibilityAllowedForAccess,
} from '@/lib/help/content'
import { buildHelpCorpusPromptBlock, buildAskAssistantDraft } from '@/lib/help/assistant-corpus'
import { buildPlatformNavigationPromptBlock } from '@/lib/assistant/platform-navigation'
import {
  PATH_DOCS_PUBLIC,
  PATH_HELP,
  pathDocsPublic,
  pathHelpArticle,
} from '@/lib/constants'

describe('suite help content API (Wave 1)', () => {
  clearHelpManifestCache()

  it('never leaks authenticated/internal articles to anonymous/public ceiling', () => {
    const publicOnly = listHelpArticles({
      locale: 'en',
      access: 'anonymous',
      visibilityCeiling: 'public',
    })
    expect(publicOnly.every((a) => a.visibility === 'public')).toBe(true)
    expect(publicOnly.some((a) => a.id === 'checkion.scan.geo-layers')).toBe(false)

    const leaked = getHelpArticle({
      id: 'checkion.scan.geo-layers',
      locale: 'en',
      access: 'anonymous',
      visibilityCeiling: 'public',
    })
    expect(leaked).toBeNull()

    const authArticle = getHelpArticle({
      id: 'checkion.scan.geo-layers',
      locale: 'de',
      access: 'authenticated',
    })
    expect(authArticle?.body.length).toBeGreaterThan(40)
    expect(authArticle?.titleLocalized).toMatch(/GEO/i)
  })

  it('ranks contextual articles for known routes', () => {
    const ranked = rankHelpContext({
      pathname: '/assistant',
      capability: 'assistant',
      locale: 'en',
      access: 'authenticated',
      limit: 3,
    })
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0]?.id).toBe('plexon.assistant.getting-started')
  })

  it('builds assistant corpus + navigation with help paths', () => {
    const corpus = buildHelpCorpusPromptBlock('authenticated')
    expect(corpus).toContain(PATH_HELP)
    expect(corpus).toContain('plexon.collections.overview')
    expect(corpus).toContain(pathHelpArticle('plexon.collections.overview'))

    const nav = buildPlatformNavigationPromptBlock()
    expect(nav).toContain(PATH_DOCS_PUBLIC)
    expect(nav).toContain(PATH_HELP)

    const draft = buildAskAssistantDraft('plexon.help.using-help', 'How Docs work')
    expect(draft).toContain('plexon.help.using-help')
    expect(draft).toContain(pathHelpArticle('plexon.help.using-help'))
  })

  it('keeps visibility matrix helpers strict', () => {
    expect(visibilityAllowedForAccess('public', 'anonymous')).toBe(true)
    expect(visibilityAllowedForAccess('authenticated', 'anonymous')).toBe(false)
    expect(visibilityAllowedForAccess('internal', 'authenticated')).toBe(false)
    expect(visibilityAllowedForAccess('internal', 'admin')).toBe(true)
    expect(pathDocsPublic('en')).toContain('lang=en')
    expect(pathDocsPublic('de')).toBe(PATH_DOCS_PUBLIC)
  })
})
