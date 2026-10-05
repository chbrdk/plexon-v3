'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { trackHelpEvent } from '@/lib/help/track-client'
import { pathHelpArticle } from '@/lib/constants'

export type HelpWalkthroughStepView = {
  id: string
  anchor: string | null
  title: string
  body: string
}

export type HelpWalkthroughView = {
  id: string
  title: string
  task: string
  relatedArticle?: string
  steps: HelpWalkthroughStepView[]
}

const STORAGE_PREFIX = 'plexon.help.walkthrough.'

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clearHighlight(): void {
  document.querySelectorAll('[data-help-walkthrough-active="true"]').forEach((node) => {
    node.removeAttribute('data-help-walkthrough-active')
  })
}

function highlightAnchor(selector: string | null, reducedMotion: boolean): void {
  clearHighlight()
  if (!selector) return
  try {
    const el = document.querySelector(selector)
    if (!el) return
    el.setAttribute('data-help-walkthrough-active', 'true')
    el.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  } catch {
    /* invalid selector */
  }
}

export type HelpWalkthroughPlayerProps = {
  walkthrough: HelpWalkthroughView
  onClose: () => void
  onOpenArticle?: (articleId: string) => void
}

/**
 * Replayable, dismissible walkthrough player (no external tour SaaS).
 * Spec: specs/domain/suite-help-docs.md Wave 3
 */
export function HelpWalkthroughPlayer({
  walkthrough,
  onClose,
  onOpenArticle,
}: HelpWalkthroughPlayerProps) {
  const { t } = useI18n()
  const titleId = useId()
  const liveId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(true)
  const step = walkthrough.steps[stepIndex]
  const total = walkthrough.steps.length

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    trackHelpEvent('help_walkthrough_started', { walkthroughId: walkthrough.id })
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    })
    return () => {
      mq.removeEventListener('change', sync)
      clearHighlight()
    }
  }, [walkthrough.id])

  useEffect(() => {
    if (!step) return
    highlightAnchor(step.anchor, reducedMotion)
    trackHelpEvent('help_walkthrough_step', {
      walkthroughId: walkthrough.id,
      stepId: step.id,
      stepIndex,
    })
  }, [step, stepIndex, walkthrough.id, reducedMotion])

  const finish = useCallback(
    (reason: 'completed' | 'skipped') => {
      clearHighlight()
      try {
        window.localStorage.setItem(
          storageKey(walkthrough.id),
          JSON.stringify({ status: reason, at: Date.now() }),
        )
      } catch {
        /* ignore */
      }
      trackHelpEvent(
        reason === 'completed' ? 'help_walkthrough_completed' : 'help_walkthrough_skipped',
        { walkthroughId: walkthrough.id, stepIndex },
      )
      onClose()
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus?.()
      })
    },
    [onClose, stepIndex, walkthrough.id],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish('skipped')
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  if (!step) return null

  return (
    <div className="plexon-help-walkthrough-root" data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <div className="plexon-help-walkthrough-scrim" aria-hidden="true" />
      <div
        ref={panelRef}
        className="plexon-help-walkthrough"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p id={liveId} className="plexon-help-sr-only" aria-live="polite">
          {t('help.walkthroughLive', { current: stepIndex + 1, total })}
        </p>
        <header className="plexon-help-walkthrough__header">
          <Text role="meta">
            {t('help.walkthroughProgress', { current: stepIndex + 1, total })}
          </Text>
          <h2 id={titleId}>{walkthrough.title}</h2>
          <Text role="meta">{walkthrough.task}</Text>
        </header>
        <div className="plexon-help-walkthrough__step">
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </div>
        <footer className="plexon-help-walkthrough__actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => finish('skipped')}>
            {t('help.walkthroughSkip')}
          </Button>
          {stepIndex > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setStepIndex((i) => i - 1)}>
              {t('help.walkthroughBack')}
            </Button>
          ) : null}
          {stepIndex < total - 1 ? (
            <Button type="button" variant="subtle" size="sm" onClick={() => setStepIndex((i) => i + 1)}>
              {t('help.walkthroughNext')}
            </Button>
          ) : (
            <Button type="button" variant="subtle" size="sm" onClick={() => finish('completed')}>
              {t('help.walkthroughDone')}
            </Button>
          )}
          {walkthrough.relatedArticle ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const id = walkthrough.relatedArticle!
                if (onOpenArticle) {
                  onOpenArticle(id)
                  finish('completed')
                } else {
                  window.location.assign(pathHelpArticle(id))
                }
              }}
            >
              {t('help.walkthroughArticle')}
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

/** Test helper: storage key for walkthrough completion. */
export function helpWalkthroughStorageKey(id: string): string {
  return storageKey(id)
}

export { prefersReducedMotion, clearHighlight }
