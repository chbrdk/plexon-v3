import Link from 'next/link'
import { MarkdownProse, Text } from '@msqdx/ui'
import { PATH_DOCS_PUBLIC, PATH_HELP, pathHelpArticle } from '@/lib/constants'
import type { HelpArticleDetail, HelpArticleSummary, HelpLocale } from '@/lib/help/types'
import styles from './help-auth.module.css'

export function HelpAuthIndex({
  locale,
  articles,
}: {
  locale: HelpLocale
  articles: HelpArticleSummary[]
}) {
  return (
    <div className={styles.root}>
      <Text role="meta" className={styles.kicker}>
        {locale === 'de' ? 'Hilfe & Docs' : 'Help & Docs'}
      </Text>
      <h1 className={styles.title}>{locale === 'de' ? 'Hilfe' : 'Help'}</h1>
      <p className={styles.lead}>
        {locale === 'de'
          ? 'Artikel zu dieser Suite. Kontextuelle Hilfe öffnest du jederzeit über „?“ in der Topbar.'
          : 'Articles for this suite. Open contextual help anytime via “?” in the top bar.'}
      </p>
      <ul className={styles.list}>
        {articles.map((article) => (
          <li key={article.id}>
            <Link href={pathHelpArticle(article.id)} className={styles.card}>
              <strong>{article.titleLocalized}</strong>
              <span>{article.taskLocalized}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.foot}>
        <Link href={PATH_DOCS_PUBLIC}>
          {locale === 'de' ? 'Öffentliche Dokumentation' : 'Public documentation'}
        </Link>
      </p>
    </div>
  )
}

export function HelpAuthArticle({
  locale,
  article,
  related,
}: {
  locale: HelpLocale
  article: HelpArticleDetail
  related: HelpArticleSummary[]
}) {
  return (
    <div className={styles.root}>
      <p className={styles.back}>
        <Link href={PATH_HELP}>{locale === 'de' ? '← Hilfe-Übersicht' : '← Help index'}</Link>
      </p>
      <h1 className={styles.title}>{article.titleLocalized}</h1>
      <p className={styles.lead}>{article.taskLocalized}</p>
      <MarkdownProse as="article">{article.body}</MarkdownProse>
      {related.length > 0 ? (
        <section className={styles.related} aria-labelledby="help-related-auth">
          <h2 id="help-related-auth">{locale === 'de' ? 'Weiter' : 'Related'}</h2>
          <ul className={styles.list}>
            {related.map((row) => (
              <li key={row.id}>
                <Link href={pathHelpArticle(row.id)} className={styles.card}>
                  <strong>{row.titleLocalized}</strong>
                  <span>{row.taskLocalized}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
