'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { EmptyState, Spinner, Text, Button } from '@msqdx/ui'
import { AssistantChat } from '@/components/assistant/AssistantChat'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  ASSISTANT_EMBED_CAPABILITY_QUERY_PARAM,
  ASSISTANT_EMBED_PATHNAME_QUERY_PARAM,
  ASSISTANT_EMBED_PRODUCT_QUERY_PARAM,
  ASSISTANT_EMBED_THEME_QUERY_PARAM,
  ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM,
  PATH_LOGIN,
} from '@/lib/constants'
import { postAssistantEmbedMessage, isAssistantHostMessage } from '@/lib/assistant/embed-protocol'
import { applyAssistantEmbedTheme } from '@/lib/assistant/embed-theme'
import {
  isAssistantPageContextProduct,
  mergeAssistantPageContext,
  parseAssistantPageContext,
  type AssistantPageContext,
} from '@/lib/assistant/page-context'
import { normalizeAssistantEmbedProduct } from '@/lib/paths/assistant-embed'

function EmbedAuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const { t } = useI18n()

  useEffect(() => {
    if (status !== 'unauthenticated') return
    if (typeof window === 'undefined' || window.parent === window) return
    let targetOrigin = ''
    try {
      if (document.referrer) targetOrigin = new URL(document.referrer).origin
    } catch {
      return
    }
    if (!targetOrigin) return
    postAssistantEmbedMessage(window.parent, targetOrigin, {
      type: 'assistant:auth-required',
      loginPath: PATH_LOGIN,
    })
  }, [status])

  if (status === 'loading') {
    return (
      <EmptyState className="chat-empty">
        <Spinner size="sm" /> {t('common.loading')}
      </EmptyState>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <EmptyState className="chat-empty">
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

function EmbedThemeSync() {
  const searchParams = useSearchParams()

  useEffect(() => {
    applyAssistantEmbedTheme(searchParams.get(ASSISTANT_EMBED_THEME_QUERY_PARAM))
  }, [searchParams])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isAssistantHostMessage(event.data)) return
      if (event.data.type !== 'assistant:theme') return
      applyAssistantEmbedTheme(event.data.themeId)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return null
}

function EmbedAssistantChat() {
  const searchParams = useSearchParams()
  const [liveContext, setLiveContext] = useState<AssistantPageContext | null>(null)

  const queryContext = useMemo((): AssistantPageContext | null => {
    const productRaw = normalizeAssistantEmbedProduct(
      searchParams.get(ASSISTANT_EMBED_PRODUCT_QUERY_PARAM)
    )
    if (!isAssistantPageContextProduct(productRaw)) return null
    return parseAssistantPageContext({
      product: productRaw,
      pathname: searchParams.get(ASSISTANT_EMBED_PATHNAME_QUERY_PARAM) || '/',
      capability: searchParams.get(ASSISTANT_EMBED_CAPABILITY_QUERY_PARAM) || undefined,
      platformProjectId: searchParams.get(ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM) || undefined,
    })
  }, [searchParams])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isAssistantHostMessage(event.data)) return
      if (event.data.type !== 'assistant:context') return
      const product = isAssistantPageContextProduct(event.data.product)
        ? event.data.product
        : null
      if (!product) return
      setLiveContext(
        parseAssistantPageContext({
          product,
          pathname: event.data.pathname || '/',
          capability: event.data.capability,
          platformProjectId: event.data.platformProjectId,
          entityType: event.data.entityType,
          entityId: event.data.entityId,
        })
      )
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const pageContext = mergeAssistantPageContext(queryContext, liveContext)

  return <AssistantChat presentation="overlay" pageContext={pageContext} />
}

export default function AssistantEmbedPage() {
  const { t } = useI18n()

  return (
    <div className="plexon-assistant-embed" data-section="assistant-embed">
      <Suspense
        fallback={
          <EmptyState className="chat-empty">
            <Spinner size="sm" /> {t('common.loading')}
          </EmptyState>
        }
      >
        <EmbedThemeSync />
        <EmbedAuthGate>
          <EmbedAssistantChat />
        </EmbedAuthGate>
      </Suspense>
    </div>
  )
}
