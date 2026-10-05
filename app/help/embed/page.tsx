'use client'

import { Suspense, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { EmptyState, Spinner, Text, Button } from '@msqdx/ui'
import { HelpHubPanel } from '@/components/help/HelpHubPanel'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  HELP_EMBED_ARTICLE_QUERY_PARAM,
  HELP_EMBED_CAPABILITY_QUERY_PARAM,
  HELP_EMBED_PATHNAME_QUERY_PARAM,
  HELP_EMBED_PRODUCT_QUERY_PARAM,
  HELP_EMBED_THEME_QUERY_PARAM,
  HELP_LANG_QUERY,
  PATH_LOGIN,
} from '@/lib/constants'
import { applyAssistantEmbedTheme } from '@/lib/assistant/embed-theme'

function EmbedAuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const { t } = useI18n()

  if (status === 'loading') {
    return (
      <EmptyState>
        <Spinner size="sm" /> {t('common.loading')}
      </EmptyState>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <EmptyState>
        <Text role="title" as="h2">
          {t('assistant.embedSignInTitle')}
        </Text>
        <Text role="body" as="p">
          {t('assistant.embedSignInHint')}
        </Text>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            window.open(PATH_LOGIN, '_blank', 'noopener,noreferrer')
          }}
        >
          {t('assistant.embedSignInCta')}
        </Button>
      </EmptyState>
    )
  }

  return <>{children}</>
}

function HelpEmbedInner() {
  const searchParams = useSearchParams()
  const product = searchParams.get(HELP_EMBED_PRODUCT_QUERY_PARAM)
  const pathname = searchParams.get(HELP_EMBED_PATHNAME_QUERY_PARAM)
  const capability = searchParams.get(HELP_EMBED_CAPABILITY_QUERY_PARAM)
  const articleId = searchParams.get(HELP_EMBED_ARTICLE_QUERY_PARAM)
  const theme = searchParams.get(HELP_EMBED_THEME_QUERY_PARAM)
  const lang = searchParams.get(HELP_LANG_QUERY)

  useEffect(() => {
    if (theme) applyAssistantEmbedTheme(theme)
  }, [theme])

  useEffect(() => {
    if (lang === 'en' || lang === 'de') {
      document.documentElement.lang = lang
    }
  }, [lang])

  const panel = useMemo(
    () => (
      <HelpHubPanel
        embed
        productFilter={product}
        pathnameOverride={pathname}
        capabilityOverride={capability || product}
        initialArticleId={articleId}
      />
    ),
    [articleId, capability, pathname, product],
  )

  return (
    <div className="plexon-help-embed">
      <EmbedAuthGate>{panel}</EmbedAuthGate>
    </div>
  )
}

export default function HelpEmbedPage() {
  return (
    <Suspense
      fallback={
        <EmptyState>
          <Spinner size="sm" />
        </EmptyState>
      }
    >
      <HelpEmbedInner />
    </Suspense>
  )
}
