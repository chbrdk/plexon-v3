import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getHelpArticle, listHelpArticles, normalizeHelpLocale } from '@/lib/help/content'
import { HelpAuthArticle } from '@/components/help/HelpAuthViews'
import { getServerLocale } from '@/lib/i18n/server'
import type { HelpLocale } from '@/lib/help/types'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const locale = normalizeHelpLocale(await getServerLocale())
  const article = getHelpArticle({ id, locale, access: 'authenticated' })
  return { title: article?.titleLocalized ?? 'Help' }
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const locale = normalizeHelpLocale(await getServerLocale()) as HelpLocale
  const article = getHelpArticle({ id, locale, access: 'authenticated' })
  if (!article) notFound()

  const relatedIds = new Set(article.relatedArticles ?? [])
  const related = listHelpArticles({ locale, access: 'authenticated' }).filter(
    (row) => relatedIds.has(row.id) && row.id !== article.id,
  )

  return <HelpAuthArticle locale={locale} article={article} related={related} />
}
