'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  Button,
  ChatBlockPanel,
  ConfirmDialog,
  IconClock,
  IconHistory,
  IconProjects,
  IconText,
  IconVideo,
  Panel,
  StepStrip,
  StepStripItem,
  Text,
} from '@msqdx/ui'
import type { videoHitStripPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof videoHitStripPropsSchema>
type Hit = Props['items'][number]
type HitAction = NonNullable<Hit['actions']>[number]
type FilmFrame = NonNullable<Hit['filmstrip']>[number]

type PendingWrite = {
  kind: 'analysis_run' | 'brand_check_run'
  label: string
  mediaAssetId: string
  platformProjectId: string
}

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="plexon-video-hit-row">
      <span className="plexon-video-hit-row-icon" aria-hidden>
        {icon}
      </span>
      <span className="plexon-video-hit-row-text">{children}</span>
    </div>
  )
}

function HitMedia({
  hit,
  focusTMs,
  previewActive,
}: {
  hit: Hit
  focusTMs: number | null
  previewActive: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const poster =
    focusTMs != null && hit.filmstrip?.length
      ? hit.filmstrip.find((f) => f.tMs === focusTMs)?.posterUrl ?? hit.posterUrl
      : hit.posterUrl
  const previewSrc =
    focusTMs != null && hit.mediaAssetId && hit.platformProjectId
      ? hit.previewUrl
        ? (() => {
            try {
              const u = new URL(hit.previewUrl, 'https://plexon.local')
              u.searchParams.set('t', String(focusTMs))
              return `${u.pathname}?${u.searchParams.toString()}`
            } catch {
              return hit.previewUrl
            }
          })()
        : undefined
      : hit.previewUrl

  if (previewActive && previewSrc) {
    return (
      <video
        ref={(el) => {
          videoRef.current = el
          if (el) {
            void el.play().catch(() => {})
          }
        }}
        className="plexon-video-hit-shot plexon-video-hit-preview"
        src={previewSrc}
        muted
        playsInline
        preload="metadata"
        loop
        aria-hidden
      />
    )
  }

  if (!poster) {
    return <div className="plexon-video-hit-shot plexon-video-hit-shot--empty" aria-hidden />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same-origin poster proxy JPEG
    <img src={poster} alt="" className="plexon-video-hit-shot" loading="lazy" data-title={hit.title} />
  )
}

function openHitAt(hit: Hit, tMs?: number | null) {
  if (tMs == null || !Number.isFinite(tMs)) {
    window.open(hit.href, '_blank', 'noopener,noreferrer')
    return
  }
  try {
    const u = new URL(hit.href)
    u.searchParams.set('t', String(Math.floor(tMs)))
    window.open(u.toString(), '_blank', 'noopener,noreferrer')
  } catch {
    window.open(hit.href, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Generative `video_hit_strip` — VIDEON scene search cards (StepStrip like Product /chat).
 * Spec: assistant-videon-mcp.md · assistant-videon-hit-chrome.md
 */
export function UiVideoHitStrip({ title, items }: Props) {
  const [focusByHit, setFocusByHit] = useState<Record<string, number | null>>({})
  const [hoverHitId, setHoverHitId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingWrite | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const runWrite = useCallback(async (write: PendingWrite) => {
    setActionBusy(true)
    setActionError(null)
    try {
      const res = await fetch('/api/assistant/videon-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: write.kind,
          mediaAssetId: write.mediaAssetId,
          platformProjectId: write.platformProjectId,
          confirmed: true,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setActionError(body?.error ?? `Aktion fehlgeschlagen (${res.status})`)
        return
      }
    } catch {
      setActionError('Netzwerkfehler bei VIDEON-Aktion')
    } finally {
      setActionBusy(false)
      setPending(null)
    }
  }, [])

  const onAction = (hit: Hit, action: HitAction) => {
    if (action.kind === 'open') {
      openHitAt(hit, focusByHit[hit.id] ?? hit.startMs ?? null)
      return
    }
    const mediaAssetId = hit.mediaAssetId?.trim() ?? ''
    const platformProjectId = hit.platformProjectId?.trim() ?? ''
    if (!mediaAssetId || !platformProjectId) {
      setActionError('mediaAssetId / platformProjectId fehlen')
      return
    }
    setActionError(null)
    setPending({
      kind: action.kind,
      label: action.label,
      mediaAssetId,
      platformProjectId,
    })
  }

  return (
    <div data-plexon-assistant-ui className="plexon-video-hit-strip">
      <ChatBlockPanel title={title ?? 'Szenen'} eyebrow="videon" className="plexon-video-hit-panel">
        {actionError ? (
          <Text role="meta" className="plexon-video-hit-action-error">
            {actionError}
          </Text>
        ) : null}
        <StepStrip
          className="plexon-video-hits"
          aria-label={title ?? 'Szenen'}
          scrollerLabel={title ?? 'Szenen'}
        >
          {items.map((hit: Hit, idx) => {
            const label = [hit.title, hit.sceneLabel, hit.timingLabel].filter(Boolean).join(' · ')
            const focusTMs = focusByHit[hit.id] ?? hit.startMs ?? null
            const previewActive = hoverHitId === hit.id
            return (
              <StepStripItem
                key={hit.id}
                index={idx}
                className="plexon-video-hit-slide"
                label={label}
                onActivate={() => {
                  openHitAt(hit, focusTMs)
                }}
              >
                <Panel
                  as="div"
                  className="plexon-video-hit-card"
                  onMouseEnter={() => setHoverHitId(hit.id)}
                  onMouseLeave={() => setHoverHitId((cur) => (cur === hit.id ? null : cur))}
                  onFocus={() => setHoverHitId(hit.id)}
                  onBlur={() => setHoverHitId((cur) => (cur === hit.id ? null : cur))}
                >
                  <HitMedia hit={hit} focusTMs={focusTMs} previewActive={previewActive} />
                  <div className="plexon-video-hit-body">
                    <Text role="headline" as="h4" className="plexon-video-hit-title">
                      {hit.title}
                    </Text>
                    {hit.filmstrip && hit.filmstrip.length > 1 ? (
                      <div className="plexon-video-hit-filmstrip" role="list" aria-label="Filmstrip">
                        {hit.filmstrip.map((frame: FilmFrame) => (
                          <button
                            key={`${hit.id}-${frame.tMs}-${frame.sceneKey ?? ''}`}
                            type="button"
                            role="listitem"
                            className={`plexon-video-hit-filmframe${
                              focusTMs === frame.tMs ? ' is-active' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusByHit((prev) => ({ ...prev, [hit.id]: frame.tMs }))
                              openHitAt(hit, frame.tMs)
                            }}
                          >
                            {frame.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- same-origin poster
                              <img src={frame.posterUrl} alt="" loading="lazy" />
                            ) : (
                              <span className="plexon-video-hit-filmframe-empty" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="plexon-video-hit-facts" role="list">
                      {hit.sceneLabel ? (
                        <MetaRow icon={<IconVideo size={14} />}>
                          <span role="listitem">{hit.sceneLabel}</span>
                        </MetaRow>
                      ) : null}
                      {hit.timingLabel ? (
                        <MetaRow icon={<IconClock size={14} />}>
                          <span role="listitem">{hit.timingLabel}</span>
                        </MetaRow>
                      ) : null}
                      {hit.durationLabel ? (
                        <MetaRow icon={<IconHistory size={14} />}>
                          <span role="listitem">{hit.durationLabel}</span>
                        </MetaRow>
                      ) : null}
                      {hit.projectName ? (
                        <MetaRow icon={<IconProjects size={14} />}>
                          <span role="listitem">{hit.projectName}</span>
                        </MetaRow>
                      ) : null}
                      {hit.snippet ? (
                        <MetaRow icon={<IconText size={14} />}>
                          <span role="listitem" className="plexon-video-hit-snippet">
                            {hit.snippet}
                          </span>
                        </MetaRow>
                      ) : null}
                    </div>
                    {hit.actions && hit.actions.length > 0 ? (
                      <div className="plexon-video-hit-actions">
                        {hit.actions.map((action) => (
                          <Button
                            key={action.id}
                            type="button"
                            size="sm"
                            variant={action.kind === 'open' ? 'primary' : 'ghost'}
                            disabled={actionBusy}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAction(hit, action)
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </StepStripItem>
            )
          })}
        </StepStrip>
      </ChatBlockPanel>
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => {
          if (!actionBusy) setPending(null)
        }}
        onConfirm={() => {
          if (pending) void runWrite(pending)
        }}
        title={pending ? `${pending.label} starten?` : 'Bestätigen'}
        confirmLabel={actionBusy ? '…' : 'Bestätigen'}
        cancelLabel="Abbrechen"
      >
        <Text role="body">
          {pending
            ? `VIDEON-Aktion „${pending.label}“ für ${pending.mediaAssetId} ausführen.`
            : null}
        </Text>
      </ConfirmDialog>
    </div>
  )
}
