'use client'

import { Suspense } from 'react'
import { EmptyState, Spinner } from '@msqdx/ui'
import { AssistantChat } from '@/components/assistant/AssistantChat'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function AssistantPage() {
  const { t } = useI18n()

  return (
    <div className="plexon-assistant-stage" data-section="assistant">
      <Suspense
        fallback={
          <EmptyState className="chat-empty">
            <Spinner size="sm" /> {t('common.loading')}
          </EmptyState>
        }
      >
        <AssistantChat />
      </Suspense>
    </div>
  )
}
