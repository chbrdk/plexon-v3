'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button, Dialog } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useAssistantPageContext } from '@/components/assistant/AssistantPageContext'
import { HelpHubPanel } from '@/components/help/HelpHubPanel'
import {
  HelpWalkthroughPlayer,
  type HelpWalkthroughView,
} from '@/components/help/HelpWalkthrough'
import {
  HELP_OPEN_EVENT,
  type HelpOpenDetail,
} from '@/lib/help/events'
import { trackHelpEvent } from '@/lib/help/track-client'

function HelpGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1.1.8-1.1 1.6V14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

/**
 * Header Help control + dialog hub (Wave 1+).
 * Spec: specs/domain/suite-help-docs.md
 */
export function HelpHost() {
  const { t } = useI18n()
  const pathname = usePathname()
  const pageContext = useAssistantPageContext()
  const [open, setOpen] = useState(false)
  const [seedArticleId, setSeedArticleId] = useState<string | null>(null)
  const [panelKey, setPanelKey] = useState(0)
  const [activeWalkthrough, setActiveWalkthrough] = useState<HelpWalkthroughView | null>(null)

  const openHub = useCallback(
    (detail?: HelpOpenDetail) => {
      setSeedArticleId(detail?.articleId?.trim() || null)
      setPanelKey((k) => k + 1)
      setOpen(true)
      trackHelpEvent('help_open', {
        articleId: detail?.articleId?.trim() || '',
        pathname: pathname || '',
      })
    },
    [pathname],
  )

  useEffect(() => {
    function onHelpOpen(event: Event) {
      const detail = (event as CustomEvent<HelpOpenDetail>).detail
      openHub(detail ?? {})
    }
    window.addEventListener(HELP_OPEN_EVENT, onHelpOpen)
    return () => window.removeEventListener(HELP_OPEN_EVENT, onHelpOpen)
  }, [openHub])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('help.openAria')}
        title={t('help.openAria')}
        onClick={() => openHub()}
        data-testid="help-host-trigger"
        icon={<HelpGlyph />}
      >
        {t('help.triggerLabel')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('help.hubTitle')}
        actions={
          <Button type="button" variant="subtle" size="sm" onClick={() => setOpen(false)}>
            {t('help.close')}
          </Button>
        }
      >
        {open ? (
          <HelpHubPanel
            key={panelKey}
            pathnameOverride={pathname}
            capabilityOverride={pageContext?.capability}
            initialArticleId={seedArticleId}
            onRequestClose={() => setOpen(false)}
            onStartWalkthrough={(wt) => {
              setOpen(false)
              setActiveWalkthrough(wt)
            }}
          />
        ) : null}
      </Dialog>
      {activeWalkthrough ? (
        <HelpWalkthroughPlayer
          walkthrough={activeWalkthrough}
          onClose={() => setActiveWalkthrough(null)}
          onOpenArticle={(id) => {
            setActiveWalkthrough(null)
            openHub({ articleId: id })
          }}
        />
      ) : null}
    </>
  )
}
