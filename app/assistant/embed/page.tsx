'use client'

import { Suspense, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { EmptyState, Spinner, Text, Button } from '@msqdx/ui'
import { AssistantChat } from '@/components/assistant/AssistantChat'
import { useI18n } from '@/components/i18n/I18nProvider'
import { PATH_LOGIN } from '@/lib/constants'
import { postAssistantEmbedMessage } from '@/lib/assistant/embed-protocol'

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
        <EmbedAuthGate>
          <AssistantChat presentation="overlay" />
        </EmbedAuthGate>
      </Suspense>
    </div>
  )
}
