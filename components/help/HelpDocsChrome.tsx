import type { ReactNode } from 'react'
import Link from 'next/link'
import { MarkdownProse } from '@msqdx/ui'
import {
  HELP_LANG_QUERY,
  PATH_DOCS_PUBLIC,
  PATH_HELP,
  PATH_LOGIN,
  pathDocsArticle,
  pathHelpArticle,
} from '@/lib/constants'
import type { HelpArticleDetail, HelpArticleSummary, HelpLocale } from '@/lib/help/types'
import styles from './help-docs.module.css'

export type HelpDocsChromeMode = 'public' | 'auth'

type HelpDocsShellProps = {
  mode: HelpDocsChromeMode
  locale: HelpLocale
  title: string
  lead?: string
  children: ReactNode
}

function withLang(href: string, locale: HelpLocale): string {
  if (locale === 'de') return href
  const join = href.includes('?') ? '&' : '?'
  return `${href}${join}${HELP_LANG_QUERY}=${locale}`
}

export function HelpDocsShell({ mode, locale, title, lead, children }: HelpDocsShellProps) {
  const home = mode === 'public' ? PATH_DOCS_PUBLIC : PATH_HELP
  const otherLocale: HelpLocale = locale === 'de' ? 'en' : 'de'
  return (
    <div className={styles.root} data-help-mode={mode}>
      <header className={styles.masthead}>
        <a className={styles.brand} href={withLang(home, locale)}>
          PLEXON {mode === 'public' ? 'Docs' : 'Help'}
        </a>
        <nav className={styles.lang} aria-label={locale === 'de' ? 'Sprache' : 'Language'}>
          <a
            href={withLang(home, 'de')}
            hrefLang="de"
            aria-current={locale === 'de' ? 'page' : undefined}
          >
            DE
          </a>
          <a
            href={withLang(home, 'en')}
            hrefLang="en"
            aria-current={locale === 'en' ? 'page' : undefined}
          >
            EN
          </a>
        </nav>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
        {children}
      </main>
      <footer className={styles.footer}>
        {mode === 'public' ? (
          <p>
            <Link href={PATH_LOGIN}>
              {locale === 'de' ? 'In der Suite öffnen' : 'Open in the suite'}
            </Link>
            {' · '}
            <span>
              {locale === 'de' ? 'Andere Sprache:' : 'Other language:'} {otherLocale.toUpperCase()}
            </span>
          </p>
        ) : (
          <p>
            <Link href={PATH_DOCS_PUBLIC}>
              {locale === 'de' ? 'Öffentliche Docs' : 'Public docs'}
            </Link>
          </p>
        )}
      </footer>
    </div>
  )
}

export function HelpArticleList({
  mode,
  locale,
  articles,
}: {
  mode: HelpDocsChromeMode
  locale: HelpLocale
  articles: HelpArticleSummary[]
}) {
  const hrefFor = (id: string) =>
    mode === 'public' ? withLang(pathDocsArticle(id), locale) : pathHelpArticle(id)
  return (
    <ul className={styles.list}>
      {articles.map((article) => (
        <li key={article.id}>
          <Link href={hrefFor(article.id)} className={styles.card}>
            <strong>{article.titleLocalized}</strong>
            <span>{article.taskLocalized}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function HelpArticleBody({
  mode,
  locale,
  article,
  related,
}: {
  mode: HelpDocsChromeMode
  locale: HelpLocale
  article: HelpArticleDetail
  related: HelpArticleSummary[]
}) {
  const indexHref = mode === 'public' ? withLang(PATH_DOCS_PUBLIC, locale) : PATH_HELP
  const suiteCta =
    mode === 'public'
      ? `${PATH_LOGIN}?callbackUrl=${encodeURIComponent(pathHelpArticle(article.id))}`
      : null

  return (
    <article className={styles.article}>
      <p className={styles.task}>{article.taskLocalized}</p>
      <MarkdownProse as="div">{article.body}</MarkdownProse>
      {related.length > 0 ? (
        <section className={styles.related} aria-labelledby="help-related">
          <h2 id="help-related">{locale === 'de' ? 'Weiter' : 'Related'}</h2>
          <HelpArticleList mode={mode} locale={locale} articles={related} />
        </section>
      ) : null}
      <p className={styles.back}>
        <Link href={indexHref}>{locale === 'de' ? 'Zur Übersicht' : 'Back to index'}</Link>
        {suiteCta ? (
          <>
            {' · '}
            <Link href={suiteCta}>
              {locale === 'de' ? 'In der Suite öffnen' : 'Open in the suite'}
            </Link>
          </>
        ) : null}
      </p>
    </article>
  )
}
