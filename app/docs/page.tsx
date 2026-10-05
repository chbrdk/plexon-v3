import type { Metadata } from 'next'
import { getServerLocale } from '@/lib/i18n/server'
import { listHelpArticles, normalizeHelpLocale } from '@/lib/help/content'
import { HelpArticleList, HelpDocsShell } from '@/components/help/HelpDocsChrome'
import { HELP_LANG_QUERY, PATH_DOCS_PUBLIC, pathDocsPublic } from '@/lib/constants'
import type { HelpLocale } from '@/lib/help/types'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function pickLang(
  raw: string | string[] | undefined,
  fallback: string,
): HelpLocale {
  const value = Array.isArray(raw) ? raw[0] : raw
  return normalizeHelpLocale(value ?? fallback)
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {}
  const fallback = await getServerLocale()
  const locale = pickLang(params[HELP_LANG_QUERY] ?? params.lang, fallback)
  const title = locale === 'de' ? 'PLEXON Dokumentation' : 'PLEXON Documentation'
  const description =
    locale === 'de'
      ? 'Öffentliche Suite-Dokumentation für Collections, Capabilities und Hilfe.'
      : 'Public suite documentation for Collections, capabilities, and help.'
  return {
    title,
    description,
    alternates: {
      canonical: pathDocsPublic(locale),
      languages: {
        de: pathDocsPublic('de'),
        en: pathDocsPublic('en'),
      },
    },
  }
}

export default async function DocsIndexPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const fallback = await getServerLocale()
  const locale = pickLang(params[HELP_LANG_QUERY] ?? params.lang, fallback)
  const articles = listHelpArticles({
    locale,
    access: 'anonymous',
    visibilityCeiling: 'public',
  })

  return (
    <HelpDocsShell
      mode="public"
      locale={locale}
      title={locale === 'de' ? 'Dokumentation' : 'Documentation'}
      lead={
        locale === 'de'
          ? 'Öffentliche How-tos für die MSQ DX Suite. Collection first — keine App-Inseln.'
          : 'Public how-tos for the MSQ DX suite. Collection first — no app islands.'
      }
    >
      <HelpArticleList mode="public" locale={locale} articles={articles} />
      <p style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.7 }}>
        <a href={PATH_DOCS_PUBLIC}>{PATH_DOCS_PUBLIC}</a>
      </p>
    </HelpDocsShell>
  )
}
