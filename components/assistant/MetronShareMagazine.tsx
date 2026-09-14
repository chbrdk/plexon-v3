'use client'

import { useCallback, useState } from 'react'
import { Button, Chip, Text } from '@msqdx/ui'
import { AssistantMessageBlocks } from '@/components/assistant-ui/AssistantBlockRenderer'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { MetronDashboardShareSnapshot, UiLayout } from '@/lib/assistant/ui-blocks/types'

type Props = {
  snapshot: MetronDashboardShareSnapshot
  layout: UiLayout
  createdAt?: string | null
  shareUrl: string
}

/** Read-only magazine chrome for `/share/metron/:token` (EQC-lite). */
export function MetronShareMagazine({ snapshot, layout, createdAt, shareUrl }: Props) {
  const { t } = useI18n()
  const [feedback, setFeedback] = useState<string | null>(null)

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setFeedback(t('assistant.metron.shareLinkCopied'))
      window.setTimeout(() => setFeedback(null), 2500)
    } catch {
      setFeedback(t('assistant.metron.shareLinkError'))
      window.setTimeout(() => setFeedback(null), 3500)
    }
  }, [shareUrl, t])

  const printPdf = useCallback(() => {
    window.print()
  }, [])

  const when =
    createdAt && !Number.isNaN(Date.parse(createdAt))
      ? new Date(createdAt).toLocaleString()
      : null

  return (
    <main
      className="plexon-metron-share-page plexon-public-report"
      data-testid="metron-share-magazine"
      data-plexon-assistant-ui
    >
      <header className="plexon-metron-share-masthead">
        <div className="plexon-metron-share-masthead__copy">
          <Text role="meta" as="p" className="plexon-metron-share-kicker">
            METRON
          </Text>
          <Text role="headline" as="h1">
            {snapshot.name}
          </Text>
          <div className="plexon-metron-share-masthead__meta">
            <Chip static size="sm">
              {t('assistant.metron.shareReadOnly')}
            </Chip>
            {when ? (
              <Text role="meta" as="span">
                {when}
              </Text>
            ) : null}
          </div>
        </div>
        <div className="plexon-metron-share-masthead__actions plexon-metron-share-no-print">
          <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink()}>
            {t('assistant.metron.shareCopyAgain')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={printPdf}>
            {t('assistant.metron.sharePrintPdf')}
          </Button>
        </div>
      </header>
      {feedback ? (
        <Text role="meta" as="p" className="plexon-metron-share-no-print">
          {feedback}
        </Text>
      ) : null}
      <AssistantMessageBlocks blocks={layout.blocks} inset={false} />
    </main>
  )
}
