'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button, EmptyState, Field, Input, MarkdownProse, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useAssistantPageContext } from '@/components/assistant/AssistantPageContext'
import {
  API_HELP_ARTICLE,
  API_HELP_CONTEXT,
  API_HELP_INDEX,
  API_HELP_WALKTHROUGHS,
  PATH_DOCS_PUBLIC,
  PATH_HELP,
  pathHelpArticle,
} from '@/lib/constants'
import { dispatchAssistantOpenFromHelp } from '@/lib/help/events'
import { buildAskAssistantDraft } from '@/lib/help/assistant-corpus'
import { trackHelpEvent } from '@/lib/help/track-client'
import {
  HelpWalkthroughPlayer,
  type HelpWalkthroughView,
} from '@/components/help/HelpWalkthrough'

type HelpListItem = {
  id: string
  title: string
  task: string
  visibility?: string
}

type HelpArticlePayload = HelpListItem & {
  body: string
}

type WalkthroughListItem = {
  id: string
  title: string
  task: string
  relatedArticle?: string
  stepCount: number
  products: string[]
}

export type HelpHubPanelProps = {
  /** Override host pathname (embed query). */
  pathnameOverride?: string | null
  capabilityOverride?: string | null
  productFilter?: string | null
  initialArticleId?: string | null
  /** Compact embed chrome (no outer dialog). */
  embed?: boolean
  onAskAssistant?: () => void
  onRequestClose?: () => void
  /** Lift walkthrough player above the dialog (native HelpHost). */
  onStartWalkthrough?: (walkthrough: HelpWalkthroughView) => void
}

/**
 * Shared help hub body (native dialog + cross-app embed).
 * Spec: specs/domain/suite-help-docs.md
 */
export function HelpHubPanel({
  pathnameOverride,
  capabilityOverride,
  productFilter,
  initialArticleId,
  embed = false,
  onAskAssistant,
  onRequestClose,
  onStartWalkthrough,
}: HelpHubPanelProps) {
  const { t, locale } = useI18n()
  const routePathname = usePathname()
  const pageContext = useAssistantPageContext()
  const [query, setQuery] = useState('')
  const [contextItems, setContextItems] = useState<HelpListItem[]>([])
  const [indexItems, setIndexItems] = useState<HelpListItem[]>([])
  const [walkthroughs, setWalkthroughs] = useState<WalkthroughListItem[]>([])
  const [activeWalkthrough, setActiveWalkthrough] = useState<HelpWalkthroughView | null>(null)
  const [article, setArticle] = useState<HelpArticlePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lang = locale === 'en' ? 'en' : 'de'
  const pathname = (pathnameOverride?.trim() || routePathname || '').trim()
  const capability =
    capabilityOverride?.trim() || pageContext?.capability || productFilter || ''

  const filteredIndex = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return indexItems
    return indexItems.filter((item) =>
      `${item.id} ${item.title} ${item.task}`.toLowerCase().includes(q),
    )
  }, [indexItems, query])

  useEffect(() => {
    const q = query.trim()
    if (!q) return
    if (filteredIndex.length > 0) return
    const timer = window.setTimeout(() => {
      trackHelpEvent('help_search_zero', { query: q, pathname, product: productFilter ?? '' })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [filteredIndex.length, pathname, productFilter, query])

  const openArticle = useCallback(
    async (id: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `${API_HELP_ARTICLE}/${encodeURIComponent(id)}?locale=${encodeURIComponent(lang)}`,
          { credentials: 'same-origin' },
        )
        if (!res.ok) throw new Error('not_found')
        const json = (await res.json()) as HelpArticlePayload
        setArticle(json)
        trackHelpEvent('help_article_open', { articleId: id, pathname })
      } catch {
        setError(t('help.articleError'))
        setArticle(null)
      } finally {
        setLoading(false)
      }
    },
    [lang, pathname, t],
  )

  const loadLists = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const productQs = productFilter?.trim()
        ? `&product=${encodeURIComponent(productFilter.trim())}`
        : ''
      const walkthroughProduct = productFilter?.trim() || 'plexon'
      const [ctxRes, idxRes, wtRes] = await Promise.all([
        fetch(
          `${API_HELP_CONTEXT}?locale=${encodeURIComponent(lang)}&pathname=${encodeURIComponent(pathname)}&capability=${encodeURIComponent(capability)}${productQs}&limit=3`,
          { credentials: 'same-origin' },
        ),
        fetch(
          `${API_HELP_INDEX}?locale=${encodeURIComponent(lang)}${productQs}`,
          { credentials: 'same-origin' },
        ),
        fetch(
          `${API_HELP_WALKTHROUGHS}?locale=${encodeURIComponent(lang)}&product=${encodeURIComponent(walkthroughProduct)}&pathname=${encodeURIComponent(pathname)}`,
          { credentials: 'same-origin' },
        ),
      ])
      if (!ctxRes.ok || !idxRes.ok) throw new Error('load_failed')
      const ctxJson = (await ctxRes.json()) as { articles?: HelpListItem[] }
      const idxJson = (await idxRes.json()) as { articles?: HelpListItem[] }
      setContextItems(ctxJson.articles ?? [])
      setIndexItems(idxJson.articles ?? [])
      if (wtRes.ok) {
        const wtJson = (await wtRes.json()) as { walkthroughs?: WalkthroughListItem[] }
        setWalkthroughs(wtJson.walkthroughs ?? [])
      } else {
        setWalkthroughs([])
      }
    } catch {
      setError(t('help.loadError'))
      setContextItems([])
      setIndexItems([])
      setWalkthroughs([])
    } finally {
      setLoading(false)
    }
  }, [capability, lang, pathname, productFilter, t])

  useEffect(() => {
    void loadLists().then(() => {
      if (initialArticleId?.trim()) void openArticle(initialArticleId.trim())
    })
  }, [initialArticleId, loadLists, openArticle])

  async function startWalkthrough(id: string) {
    try {
      const res = await fetch(
        `${API_HELP_WALKTHROUGHS}?id=${encodeURIComponent(id)}&locale=${encodeURIComponent(lang)}`,
        { credentials: 'same-origin' },
      )
      if (!res.ok) throw new Error('not_found')
      const json = (await res.json()) as { walkthrough: HelpWalkthroughView }
      if (onStartWalkthrough) {
        onStartWalkthrough(json.walkthrough)
      } else {
        setActiveWalkthrough(json.walkthrough)
      }
    } catch {
      setError(t('help.walkthroughError'))
    }
  }

  function askAssistant() {
    if (!article) return
    trackHelpEvent('help_ask_assistant', { articleId: article.id })
    dispatchAssistantOpenFromHelp({
      articleId: article.id,
      title: article.title,
      draft: buildAskAssistantDraft(article.id, article.title),
    })
    onAskAssistant?.()
    onRequestClose?.()
  }

  return (
    <>
      <div
        className={embed ? 'plexon-help-hub plexon-help-hub--embed' : 'plexon-help-hub'}
        data-help-embed={embed || undefined}
      >
        {article ? (
          <div className="plexon-help-article">
            <div className="plexon-help-article__toolbar">
              <Button type="button" variant="ghost" size="sm" onClick={() => setArticle(null)}>
                {t('help.back')}
              </Button>
              <Button type="button" variant="subtle" size="sm" onClick={askAssistant}>
                {t('help.askAssistant')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                href={pathHelpArticle(article.id)}
                target={embed ? '_blank' : undefined}
              >
                {t('help.openFull')}
              </Button>
            </div>
            <Text role="title" as="h2">
              {article.title}
            </Text>
            {article.task ? (
              <Text role="meta" className="plexon-help-article__task">
                {article.task}
              </Text>
            ) : null}
            {error ? <Text role="meta">{error}</Text> : null}
            <MarkdownProse as="article">{article.body}</MarkdownProse>
          </div>
        ) : (
          <>
            <Field label={t('help.searchLabel')}>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('help.searchPlaceholder')}
                aria-label={t('help.searchLabel')}
              />
            </Field>
            {loading ? <Text role="meta">{t('help.loading')}</Text> : null}
            {error ? <Text role="meta">{error}</Text> : null}
            <section className="plexon-help-hub__section" aria-labelledby="help-context-heading">
              <h3 id="help-context-heading">{t('help.contextTitle')}</h3>
              {contextItems.length === 0 ? (
                <EmptyState>{t('help.emptyContext')}</EmptyState>
              ) : (
                <ul className="plexon-help-hub__list">
                  {contextItems.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => void openArticle(item.id)}>
                        <strong>{item.title}</strong>
                        <span>{item.task}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {walkthroughs.length > 0 ? (
              <section
                className="plexon-help-hub__section"
                aria-labelledby="help-walkthrough-heading"
              >
                <h3 id="help-walkthrough-heading">{t('help.walkthroughTitle')}</h3>
                <ul className="plexon-help-hub__list">
                  {walkthroughs.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => void startWalkthrough(item.id)}>
                        <strong>{item.title}</strong>
                        <span>
                          {item.task} · {t('help.walkthroughSteps', { count: item.stepCount })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="plexon-help-hub__section" aria-labelledby="help-browse-heading">
              <h3 id="help-browse-heading">{t('help.browseTitle')}</h3>
              {filteredIndex.length === 0 ? (
                <EmptyState>{t('help.emptySearch')}</EmptyState>
              ) : (
                <ul className="plexon-help-hub__list">
                  {filteredIndex.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => void openArticle(item.id)}>
                        <strong>{item.title}</strong>
                        <span>{item.task}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="plexon-help-hub__footer">
              <Button variant="ghost" size="sm" href={PATH_HELP} target={embed ? '_blank' : undefined}>
                {t('help.openFull')}
              </Button>
              <Button variant="ghost" size="sm" href={PATH_DOCS_PUBLIC} target="_blank">
                {t('help.openDocs')}
              </Button>
            </div>
          </>
        )}
      </div>
      {activeWalkthrough ? (
        <HelpWalkthroughPlayer
          walkthrough={activeWalkthrough}
          onClose={() => setActiveWalkthrough(null)}
          onOpenArticle={(id) => {
            setActiveWalkthrough(null)
            void openArticle(id)
          }}
        />
      ) : null}
    </>
  )
}
