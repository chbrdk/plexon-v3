/**
 * Suite Docs & Help content loader + ranking.
 * Spec: specs/domain/suite-help-docs.md · knowledge/suite-help-docs.md
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type {
  HelpAccessLevel,
  HelpArticleDetail,
  HelpArticleSummary,
  HelpLocale,
  HelpManifest,
  HelpManifestArticle,
  HelpVisibility,
} from '@/lib/help/types'
import { HELP_LOCALES } from '@/lib/help/types'

const HELP_ROOT = path.join(process.cwd(), 'content', 'help')
const MANIFEST_PATH = path.join(HELP_ROOT, 'manifest.json')
const ARTICLES_DIR = path.join(HELP_ROOT, 'articles')

let manifestCache: HelpManifest | null = null

export function getHelpContentRoot(): string {
  return HELP_ROOT
}

export function loadHelpManifest(): HelpManifest {
  if (manifestCache) return manifestCache
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Help manifest missing: ${MANIFEST_PATH}`)
  }
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as HelpManifest
  manifestCache = parsed
  return parsed
}

/** Test helper — clears cached manifest between cases. */
export function clearHelpManifestCache(): void {
  manifestCache = null
}

export function normalizeHelpLocale(value?: string | null): HelpLocale {
  if (!value) return 'de'
  const lower = value.toLowerCase()
  if (lower.startsWith('en')) return 'en'
  return 'de'
}

export function visibilityAllowedForAccess(
  visibility: HelpVisibility,
  access: HelpAccessLevel,
): boolean {
  if (visibility === 'public') return true
  if (visibility === 'authenticated') return access === 'authenticated' || access === 'admin'
  return access === 'admin'
}

export function resolveHelpAccess(role?: string | null, authenticated = false): HelpAccessLevel {
  if (!authenticated) return 'anonymous'
  if (role === 'admin') return 'admin'
  return 'authenticated'
}

function localizeArticle(
  article: HelpManifestArticle,
  locale: HelpLocale,
): HelpArticleSummary {
  return {
    ...article,
    titleLocalized: article.title[locale] || article.title.en || article.id,
    taskLocalized: article.task[locale] || article.task.en || '',
  }
}

export function listHelpArticles(opts: {
  locale?: HelpLocale | string | null
  product?: string | null
  access: HelpAccessLevel
  /** Force a visibility ceiling (e.g. public API always 'public'). */
  visibilityCeiling?: HelpVisibility
}): HelpArticleSummary[] {
  const locale = normalizeHelpLocale(opts.locale)
  const product = opts.product?.trim().toLowerCase() || null
  const ceiling = opts.visibilityCeiling

  return loadHelpManifest()
    .articles.filter((article) => {
      if (!visibilityAllowedForAccess(article.visibility, opts.access)) return false
      if (ceiling === 'public' && article.visibility !== 'public') return false
      if (ceiling === 'authenticated' && article.visibility === 'internal') return false
      if (product && !article.products.map((p) => p.toLowerCase()).includes(product)) {
        return false
      }
      return true
    })
    .map((article) => localizeArticle(article, locale))
}

export function readHelpArticleBody(id: string, locale: HelpLocale): string | null {
  const safeId = id.trim()
  if (!safeId || safeId.includes('/') || safeId.includes('..') || safeId.includes('\\')) {
    return null
  }
  if (!HELP_LOCALES.includes(locale)) return null
  const file = path.join(ARTICLES_DIR, `${safeId}.${locale}.md`)
  if (!file.startsWith(ARTICLES_DIR + path.sep)) return null
  if (!existsSync(file)) return null
  return readFileSync(file, 'utf8')
}

export function getHelpArticle(opts: {
  id: string
  locale?: HelpLocale | string | null
  access: HelpAccessLevel
  visibilityCeiling?: HelpVisibility
}): HelpArticleDetail | null {
  const locale = normalizeHelpLocale(opts.locale)
  const article = loadHelpManifest().articles.find((row) => row.id === opts.id.trim())
  if (!article) return null
  if (!visibilityAllowedForAccess(article.visibility, opts.access)) return null
  if (opts.visibilityCeiling === 'public' && article.visibility !== 'public') return null
  if (opts.visibilityCeiling === 'authenticated' && article.visibility === 'internal') return null
  const body = readHelpArticleBody(article.id, locale)
  if (body == null) return null
  return {
    ...localizeArticle(article, locale),
    body,
    locale,
  }
}

function routeScore(routes: string[] | undefined, pathname: string, capability?: string | null): number {
  if (!routes?.length) return 0
  let score = 0
  const path = pathname || ''
  const cap = capability?.trim().toLowerCase() || ''
  for (const route of routes) {
    const r = route.trim()
    if (!r) continue
    if (r.startsWith('capability:')) {
      const want = r.slice('capability:'.length).toLowerCase()
      if (cap && (cap === want || cap.includes(want))) score += 8
      continue
    }
    if (path === r || path.startsWith(r.endsWith('/') ? r : `${r}`)) {
      score += 10
      if (path === r) score += 4
    }
  }
  return score
}

export function rankHelpContext(opts: {
  pathname?: string | null
  capability?: string | null
  locale?: HelpLocale | string | null
  access: HelpAccessLevel
  product?: string | null
  limit?: number
}): HelpArticleSummary[] {
  const limit = Math.min(Math.max(opts.limit ?? 3, 1), 10)
  const pathname = opts.pathname?.trim() || ''
  const ranked = listHelpArticles({
    locale: opts.locale,
    product: opts.product,
    access: opts.access,
  })
    .map((article) => ({
      article,
      score: routeScore(article.routes, pathname, opts.capability),
    }))
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))

  const withScore = ranked.filter((row) => row.score > 0).slice(0, limit)
  if (withScore.length >= limit) return withScore.map((row) => row.article)
  const filled = [...withScore.map((row) => row.article)]
  for (const row of ranked) {
    if (filled.some((a) => a.id === row.article.id)) continue
    filled.push(row.article)
    if (filled.length >= limit) break
  }
  return filled
}

export function searchHelpArticles(
  query: string,
  articles: HelpArticleSummary[],
): HelpArticleSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return articles
  return articles.filter((article) => {
    const hay = [
      article.id,
      article.titleLocalized,
      article.taskLocalized,
      ...(article.assistantHints ?? []),
      ...article.products,
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}
