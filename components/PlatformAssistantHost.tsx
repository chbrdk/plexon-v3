'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button, ChatOverlay } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { NavIconAssistant } from '@/components/nav-icons'
import { AssistantChat } from '@/components/assistant/AssistantChat'
import {
  PATH_ASSISTANT,
  PATH_ASSISTANT_EMBED,
  buildAssistantEmbedUrl,
  pathAssistantChat,
  pathAssistantEmbed,
  pathAssistantWithProject,
  type AssistantEmbedProduct,
} from '@/lib/constants'
import {
  isAssistantEmbedMessage,
  postAssistantHostMessage,
} from '@/lib/assistant/embed-protocol'
import { readDocumentThemeId } from '@/lib/assistant/embed-theme'

export type PlatformAssistantHostProps = {
  product: AssistantEmbedProduct
  /** Absolute Plexon public origin (no trailing slash). Same-origin hosts may pass ''. */
  plexonPublicBase: string
  platformProjectId?: string | null
  capability?: string | null
  /** Hide FAB on expand routes */
  hideOnAssistantExpand?: boolean
}

function useSameOriginNative(plexonPublicBase: string): boolean {
  return useMemo(() => {
    const base = plexonPublicBase.replace(/\/$/, '')
    if (!base) return true
    if (typeof window === 'undefined') return !base
    try {
      return new URL(base).origin === window.location.origin
    } catch {
      return false
    }
  }, [plexonPublicBase])
}

function resolveEmbedSrc(
  plexonPublicBase: string,
  product: AssistantEmbedProduct,
  platformProjectId: string | null | undefined,
  capability: string | null | undefined,
  pathname: string | null,
  theme: string | null,
): string {
  const query = {
    product,
    platformProjectId,
    capability,
    pathname,
    theme,
  }
  if (typeof window !== 'undefined') {
    const base = plexonPublicBase.replace(/\/$/, '')
    if (!base || base === window.location.origin) {
      return pathAssistantEmbed(query)
    }
  }
  return buildAssistantEmbedUrl(plexonPublicBase || '', query)
}

/**
 * Central assistant FAB + ChatOverlay host (hybrid: native same-origin, iframe cross-app).
 * Spec: specs/domain/central-assistant-flyout.md
 */
export function PlatformAssistantHost({
  product,
  plexonPublicBase,
  platformProjectId,
  capability,
  hideOnAssistantExpand = true,
}: PlatformAssistantHostProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [themeId, setThemeId] = useState<string | null>(null)
  const useNative = useSameOriginNative(plexonPublicBase)

  const onExpandRoute =
    hideOnAssistantExpand &&
    Boolean(pathname?.startsWith(PATH_ASSISTANT) && !pathname?.startsWith(PATH_ASSISTANT_EMBED))

  const plexonOrigin = useMemo(() => {
    if (!plexonPublicBase) {
      if (typeof window === 'undefined') return ''
      return window.location.origin
    }
    try {
      return new URL(plexonPublicBase).origin
    } catch {
      return plexonPublicBase.replace(/\/$/, '')
    }
  }, [plexonPublicBase])

  useEffect(() => {
    const sync = () => setThemeId(readDocumentThemeId())
    sync()
    const root = document.documentElement
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const embedSrc = useMemo(() => {
    if (typeof window === 'undefined' || useNative) return ''
    return resolveEmbedSrc(
      plexonPublicBase,
      product,
      platformProjectId,
      capability,
      pathname,
      themeId,
    )
  }, [plexonPublicBase, product, platformProjectId, capability, pathname, themeId, useNative, open])

  const navigateExpand = useCallback(() => {
    setOpen(false)
    const id = conversationId
    const project = platformProjectId
    if (product === 'plexon' || useNative) {
      if (id) router.push(pathAssistantChat(id))
      else if (project) router.push(pathAssistantWithProject(project))
      else router.push(PATH_ASSISTANT)
      return
    }
    const base = plexonPublicBase.replace(/\/$/, '')
    const path = id
      ? pathAssistantChat(id)
      : project
        ? pathAssistantWithProject(project)
        : PATH_ASSISTANT
    window.open(`${base}${path}`, '_blank', 'noopener,noreferrer')
  }, [conversationId, platformProjectId, product, useNative, plexonPublicBase, router])

  const onMessage = useCallback(
    (event: MessageEvent) => {
      if (useNative) return
      if (plexonOrigin && event.origin !== plexonOrigin) return
      if (!isAssistantEmbedMessage(event.data)) return
      if (event.data.type === 'assistant:close') {
        setOpen(false)
        return
      }
      if (event.data.type === 'assistant:conversation' && event.data.conversationId) {
        setConversationId(event.data.conversationId)
        return
      }
      if (event.data.type === 'assistant:ready' && event.data.conversationId) {
        setConversationId(event.data.conversationId)
        return
      }
      if (event.data.type === 'assistant:expand') {
        setConversationId(event.data.conversationId || conversationId)
        setOpen(false)
        const id = event.data.conversationId || conversationId
        const project = event.data.project || platformProjectId
        if (product === 'plexon') {
          if (id) router.push(pathAssistantChat(id))
          else if (project) router.push(pathAssistantWithProject(project))
          else router.push(PATH_ASSISTANT)
          return
        }
        const base = plexonPublicBase.replace(/\/$/, '')
        const path = id
          ? pathAssistantChat(id)
          : project
            ? pathAssistantWithProject(project)
            : PATH_ASSISTANT
        window.open(`${base}${path}`, '_blank', 'noopener,noreferrer')
      }
    },
    [useNative, plexonOrigin, conversationId, platformProjectId, product, plexonPublicBase, router],
  )

  useEffect(() => {
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onMessage])

  useEffect(() => {
    if (!open || useNative) return
    const frame = iframeRef.current?.contentWindow
    if (!frame || !plexonOrigin) return
    postAssistantHostMessage(frame, plexonOrigin, {
      type: 'assistant:context',
      product,
      platformProjectId: platformProjectId ?? undefined,
      capability: capability ?? undefined,
      pathname: pathname ?? undefined,
    })
    if (themeId) {
      postAssistantHostMessage(frame, plexonOrigin, {
        type: 'assistant:theme',
        themeId,
      })
    }
  }, [open, useNative, product, platformProjectId, capability, pathname, plexonOrigin, themeId])

  if (onExpandRoute) return null

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="md"
        className="plexon-assistant-fab"
        aria-label={open ? t('assistant.fabClose') : t('assistant.fabOpen')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        icon={<NavIconAssistant />}
      />
      <ChatOverlay
        open={open}
        onOpenChange={setOpen}
        title={t('nav.assistant')}
        placement="dock-end"
        headerActions={
          <Button type="button" variant="subtle" size="sm" onClick={navigateExpand}>
            {t('assistant.openWorkspace')}
          </Button>
        }
      >
        {open && useNative ? (
          <AssistantChat
            presentation="overlay"
            onConversationChange={(id) => setConversationId(id)}
          />
        ) : open && embedSrc ? (
          <iframe
            ref={iframeRef}
            title={t('nav.assistant')}
            src={embedSrc}
            className="plexon-assistant-embed-frame"
          />
        ) : null}
      </ChatOverlay>
    </>
  )
}
