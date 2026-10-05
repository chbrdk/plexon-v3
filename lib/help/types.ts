/**
 * Suite Docs & Help content types.
 * Spec: specs/domain/suite-help-docs.md
 */

export const HELP_VISIBILITIES = ['public', 'authenticated', 'internal'] as const
export type HelpVisibility = (typeof HELP_VISIBILITIES)[number]

export const HELP_AUDIENCES = ['user', 'admin', 'operator'] as const
export type HelpAudience = (typeof HELP_AUDIENCES)[number]

export const HELP_LOCALES = ['en', 'de'] as const
export type HelpLocale = (typeof HELP_LOCALES)[number]

export type HelpLocaleMap = Record<HelpLocale, string>

export type HelpManifestArticle = {
  id: string
  visibility: HelpVisibility
  products: string[]
  routes?: string[]
  audience: HelpAudience
  title: HelpLocaleMap
  task: HelpLocaleMap
  relatedTips?: string[]
  relatedArticles?: string[]
  assistantHints?: string[]
}

export type HelpManifest = {
  version: number
  locales: HelpLocale[]
  articles: HelpManifestArticle[]
}

export type HelpArticleSummary = HelpManifestArticle & {
  titleLocalized: string
  taskLocalized: string
}

export type HelpArticleDetail = HelpArticleSummary & {
  body: string
  locale: HelpLocale
}

export type HelpAccessLevel = 'anonymous' | 'authenticated' | 'admin'
