import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerLocale } from '@/lib/i18n/server'
import { getHelpArticle, listHelpArticles, normalizeHelpLocale } from '@/lib/help/content'
import { HelpArticleBody, HelpDocsShell } from '@/components/help/HelpDocsChrome'
import { HELP_LANG_QUERY, pathDocsArticle, pathDocsPublic } from '@/lib/constants'
import type { HelpLocale } from '@/lib/help/types'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function pickLang(
  raw: string | string[] | undefined,
  fallback: string,
): HelpLocale {
  const value = Array.isArray(raw) ? raw[0] : raw
  return normalizeHelpLocale(value ?? fallback)
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const sp = (await searchParams) ?? {}
  const fallback = await getServerLocale()
  const locale = pickLang(sp[HELP_LANG_QUERY] ?? sp.lang, fallback)
  const article = getHelpArticle({
    id,
    locale,
    access: 'anonymous',
    visibilityCeiling: 'public',
  })
  if (!article) return { title: 'Not found' }
  return {
    title: article.titleLocalized,
    description: article.taskLocalized,
    alternates: {
      canonical: pathDocsArticle(article.id),
      languages: {
        de: `${pathDocsArticle(article.id)}`,
        en: `${pathDocsArticle(article.id)}?${HELP_LANG_QUERY}=en`,
      },
    },
  }
}

export default async function DocsArticlePage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const sp = (await searchParams) ?? {}
  const fallback = await getServerLocale()
  const locale = pickLang(sp[HELP_LANG_QUERY] ?? sp.lang, fallback)
  const article = getHelpArticle({
    id,
    locale,
    access: 'anonymous',
    visibilityCeiling: 'public',
  })
  if (!article) notFound()

  const relatedIds = new Set(article.relatedArticles ?? [])
  const related = listHelpArticles({
    locale,
    access: 'anonymous',
    visibilityCeiling: 'public',
  }).filter((row) => relatedIds.has(row.id) && row.id !== article.id)

  return (
    <HelpDocsShell mode="public" locale={locale} title={article.titleLocalized}>
      <HelpArticleBody mode="public" locale={locale} article={article} related={related} />
      <p style={{ display: 'none' }}>{pathDocsPublic(locale)}</p>
    </HelpDocsShell>
  )
}
