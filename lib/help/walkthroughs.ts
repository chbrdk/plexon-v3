/**
 * Help walkthrough content loader.
 * Spec: specs/domain/suite-help-docs.md (Wave 3)
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { HelpLocale } from '@/lib/help/types'
import { normalizeHelpLocale } from '@/lib/help/content'

export type HelpLocaleMap = Record<'en' | 'de', string>

export type HelpWalkthroughStep = {
  id: string
  anchor: string | null
  title: HelpLocaleMap
  body: HelpLocaleMap
}

export type HelpWalkthrough = {
  id: string
  products: string[]
  routes?: string[]
  relatedArticle?: string
  title: HelpLocaleMap
  task: HelpLocaleMap
  steps: HelpWalkthroughStep[]
}

type WalkthroughIndex = {
  version: number
  walkthroughs: HelpWalkthrough[]
}

const INDEX_PATH = path.join(process.cwd(), 'content', 'help', 'walkthroughs', 'index.json')

let cache: WalkthroughIndex | null = null

export function clearHelpWalkthroughCache(): void {
  cache = null
}

export function loadHelpWalkthroughs(): HelpWalkthrough[] {
  if (cache) return cache.walkthroughs
  if (!existsSync(INDEX_PATH)) return []
  cache = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as WalkthroughIndex
  return cache.walkthroughs
}

export function listHelpWalkthroughs(opts: {
  locale?: string | null
  product?: string | null
  pathname?: string | null
}): Array<{
  id: string
  title: string
  task: string
  relatedArticle?: string
  stepCount: number
  products: string[]
}> {
  const locale = normalizeHelpLocale(opts.locale)
  const product = opts.product?.trim().toLowerCase() || null
  const pathname = opts.pathname?.trim() || ''

  return loadHelpWalkthroughs()
    .filter((wt) => {
      if (product && !wt.products.map((p) => p.toLowerCase()).includes(product)) return false
      if (!pathname || !wt.routes?.length) return true
      return wt.routes.some((route) => {
        if (route.startsWith('capability:')) return true
        return pathname === route || pathname.startsWith(route)
      })
    })
    .map((wt) => ({
      id: wt.id,
      title: wt.title[locale] || wt.title.en,
      task: wt.task[locale] || wt.task.en,
      relatedArticle: wt.relatedArticle,
      stepCount: wt.steps.length,
      products: wt.products,
    }))
}

export function getHelpWalkthrough(
  id: string,
  locale?: string | null,
): {
  id: string
  title: string
  task: string
  relatedArticle?: string
  products: string[]
  steps: Array<{ id: string; anchor: string | null; title: string; body: string }>
} | null {
  const loc = normalizeHelpLocale(locale) as HelpLocale
  const wt = loadHelpWalkthroughs().find((row) => row.id === id.trim())
  if (!wt) return null
  return {
    id: wt.id,
    title: wt.title[loc] || wt.title.en,
    task: wt.task[loc] || wt.task.en,
    relatedArticle: wt.relatedArticle,
    products: wt.products,
    steps: wt.steps.map((step) => ({
      id: step.id,
      anchor: step.anchor,
      title: step.title[loc] || step.title.en,
      body: step.body[loc] || step.body.en,
    })),
  }
}
