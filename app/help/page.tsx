import type { Metadata } from 'next'
import { listHelpArticles, normalizeHelpLocale } from '@/lib/help/content'
import { HelpAuthIndex } from '@/components/help/HelpAuthViews'
import { getServerLocale } from '@/lib/i18n/server'
import type { HelpLocale } from '@/lib/help/types'

export const metadata: Metadata = {
  title: 'Help',
}

export default async function HelpIndexPage() {
  const locale = normalizeHelpLocale(await getServerLocale()) as HelpLocale
  const articles = listHelpArticles({
    locale,
    access: 'authenticated',
  })

  return <HelpAuthIndex locale={locale} articles={articles} />
}
